/**
 * Read the dev-session browser log and report per-route front-end health.
 *
 * Why this exists
 * ---------------
 * `settings/dev-log-bridge.ts` forwards browser-side PulsePoint errors into the
 * `npm run dev` terminal. That only helps whoever owns that terminal: an AI
 * agent working in a different session cannot see stdout, and spawning a second
 * `npm run dev` to get its own copy would bind different ports and orphan the
 * browser tab the developer is actually looking at.
 *
 * So the bridge also appends every event to `.pp/browser-log.jsonl`, and this
 * script renders it. `npm run logs`.
 *
 * The hard part is not reading errors, it is not lying about their absence.
 * Four ways a naive error log misleads a reader, and how the format answers
 * each:
 *
 * - **Empty is ambiguous.** No errors could mean the route is fine, or that
 *   nobody ever opened it, or that the dev server is not running. The log
 *   records `load` events and a `session` header, so those three are
 *   distinguishable and this script names them separately.
 * - **Fixed errors look current.** A clean reload writes nothing, so an error
 *   from before the fix would sit in the file forever. Because every page load
 *   is recorded, a route's state is whatever happened during its *most recent*
 *   load.
 * - **A reload does not re-test everything.** It re-runs mount, so it genuinely
 *   clears a mount-phase error -- but it never clicks a button. An error from a
 *   click handler survives the reload as NEEDS RECHECK instead of being
 *   reported CLEAN, which is how a live bug would otherwise get signed off.
 * - **Reports race.** Two POSTs can arrive out of order, so an error is tied to
 *   its load by the client-generated `page` id, never by arrival time.
 *
 * Anyone reading the raw JSONL would see a fixed error as current, so the
 * `session` line carries a `readme` explaining the supersession rule and a
 * clean reload appends an explicit `resolved` event. An error whose `page`
 * never produced a `load` in this log -- a tab left open across a dev restart
 * -- is reported as UNCONFIRMED rather than as a fresh failure.
 *
 * Every source change compacts the file down to the session header, a `restart`
 * marker, and the errors still open, so a dev session that runs for hours
 * without a restart cannot grow an unbounded log. Errors that survive a
 * compaction are marked `carried` and dropped at the next one, so a stale
 * interaction error cannot haunt the log forever.
 *
 * Usage:
 *
 *     npm run logs                     # human-readable digest
 *     npm run logs -- --json           # machine-readable status
 *     npm run logs -- --fail-on-error  # exit 1 if any route is dirty
 *
 * Exit code is 0 by default even when routes are failing: whether a route has
 * been exercised depends on someone clicking around in a browser, so this must
 * never become a flaky pass/fail gate.
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";
import { Socket } from "net";
import chalk from "chalk";

const SETTINGS_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(SETTINGS_DIR, "..");
const LOG_FILE = join(PROJECT_ROOT, ".pp", "browser-log.jsonl");

type LogEvent = Record<string, unknown>;

/** One browser page load and everything the runtime reported during it. */
type PageLoad = {
  page: string;
  route: string;
  at: string;
  errors: LogEvent[];
  warnings: LogEvent[];
  /** True when the error arrived but the matching `load` event never did. */
  orphan: boolean;
};

type RouteStatus = {
  route: string;
  lastLoad: string;
  errors: LogEvent[];
  warnings: LogEvent[];
  /** Mount errors from *earlier* loads, retested and cleared by a later load. */
  healed: number;
  /**
   * The newest errors came from a page with no `load` in this log -- typically
   * a tab opened before the last dev restart. Real, but possibly already fixed.
   */
  unconfirmed: boolean;
  /**
   * Interaction errors a reload could not retest, plus errors carried across a
   * source change. Not proof of a live bug, and not proof of a fix either.
   */
  recheck: LogEvent[];
};

function isClean(status: RouteStatus): boolean {
  return status.errors.length === 0 && status.recheck.length === 0;
}

/** Everything a caller needs to describe front-end health without guessing. */
type LogReport = {
  /** "missing" (no dev session ever wrote), "live", "ended", "stale". */
  session: "missing" | "live" | "ended" | "stale";
  started: string;
  pid: number;
  port: number;
  routes: RouteStatus[];
  /** When the log was last compacted because source files changed. */
  lastRestart: string;
};

function failing(report: LogReport): RouteStatus[] {
  return report.routes.filter((r) => !isClean(r));
}

function readEvents(path: string): LogEvent[] {
  if (!existsSync(path)) return [];
  const events: LogEvent[] = [];
  for (const rawLine of readFileSync(path, "utf-8").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        events.push(parsed as LogEvent);
      }
    } catch {
      // A torn final line (server killed mid-write) must not hide the rest.
    }
  }
  return events;
}

function portIsListening(port: number): Promise<boolean> {
  if (!port) return Promise.resolve(false);
  return new Promise((resolve) => {
    const socket = new Socket();
    socket.setTimeout(250);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

const str = (value: unknown): string => (value == null ? "" : String(value));

/** Collapse the raw event stream into current per-route status. */
export async function buildReport(path: string = LOG_FILE): Promise<LogReport> {
  const events = readEvents(path);
  if (events.length === 0) {
    return {
      session: "missing",
      started: "",
      pid: 0,
      port: 0,
      routes: [],
      lastRestart: "",
    };
  }

  let started = "";
  let pid = 0;
  let port = 0;
  let ended = false;
  let lastRestart = "";
  for (const event of events) {
    if (event.type === "session") {
      started = str(event.t);
      pid = Number(event.pid) || 0;
      port = Number(event.port) || 0;
      ended = false;
    } else if (event.type === "session-end") {
      ended = true;
    } else if (event.type === "restart") {
      lastRestart = str(event.t);
    }
  }

  // Group by the client's page id so an error is attributed to the load that
  // produced it regardless of the order the two POSTs landed in.
  const pages = new Map<string, PageLoad>();
  const order: string[] = [];
  // Errors that survived a compaction. Their `load` event was dropped with the
  // rest of the history, so they are tracked by route instead of by page.
  const carried = new Map<string, LogEvent[]>();

  const pageFor = (event: LogEvent): PageLoad => {
    const key = str(event.page) || `anon-${order.length}`;
    let page = pages.get(key);
    if (!page) {
      page = {
        page: key,
        route: str(event.route) || "?",
        at: str(event.t),
        errors: [],
        warnings: [],
        orphan: true,
      };
      pages.set(key, page);
      order.push(key);
    }
    return page;
  };

  for (const event of events) {
    const kind = event.type;
    if (event.carried) {
      const route = str(event.route) || "?";
      carried.set(route, [...(carried.get(route) ?? []), event]);
    } else if (kind === "load") {
      const page = pageFor(event);
      page.orphan = false;
      page.at = str(event.t) || page.at;
      page.route = str(event.route) || page.route;
    } else if (kind === "error") {
      pageFor(event).errors.push(event);
    } else if (kind === "warn") {
      pageFor(event).warnings.push(event);
    }
  }

  // Latest load wins: an error is only current if it happened on the most
  // recent load of that route.
  const byRoute = new Map<string, PageLoad[]>();
  for (const key of order) {
    const page = pages.get(key)!;
    byRoute.set(page.route, [...(byRoute.get(page.route) ?? []), page]);
  }

  const routes: RouteStatus[] = [];
  for (const route of [...new Set([...byRoute.keys(), ...carried.keys()])].sort()) {
    const loads = byRoute.get(route) ?? [];
    // Carried errors always need rechecking: the code changed under them.
    const recheck = [...(carried.get(route) ?? [])];

    if (loads.length === 0) {
      routes.push({
        route,
        lastLoad: "",
        errors: [],
        warnings: [],
        healed: 0,
        unconfirmed: false,
        recheck,
      });
      continue;
    }

    const latest = loads[loads.length - 1];
    let healed = 0;
    for (const page of loads.slice(0, -1)) {
      for (const err of page.errors) {
        // A later load re-ran mount, so a mount error is genuinely retested.
        // An interaction error is not: nothing reloaded here clicked anything,
        // so it stays open rather than reading CLEAN.
        if (err.phase === "interaction") {
          recheck.push(err);
        } else {
          healed += 1;
        }
      }
    }

    routes.push({
      route,
      lastLoad: latest.at,
      errors: latest.errors,
      warnings: latest.warnings,
      healed,
      unconfirmed: latest.orphan,
      recheck,
    });
  }

  let session: LogReport["session"];
  if (ended) {
    session = "ended";
  } else if (await portIsListening(port)) {
    session = "live";
  } else {
    session = "stale";
  }

  return { session, started, pid, port, routes, lastRestart };
}

function age(iso: string): string {
  if (!iso) return "";
  const moment = Date.parse(iso);
  if (Number.isNaN(moment)) return "";
  const seconds = Math.floor((Date.now() - moment) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function clock(iso: string): string {
  if (!iso) return "?";
  const moment = new Date(iso);
  if (Number.isNaN(moment.getTime())) return iso;
  return moment.toLocaleTimeString("en-GB", { hour12: false });
}

const SESSION_LINES: Record<string, [string, string]> = {
  missing: [
    "no browser log for this dev session",
    "Nothing has been observed. Start `npm run dev` and open the route " +
      "in a browser before drawing any conclusion about the front end.",
  ],
  stale: [
    "dev server is NOT running",
    "This log is left over from an exited dev session. Treat every line " +
      "below as history, not as the current state of the app.",
  ],
  ended: [
    "dev session ended cleanly",
    "The dev server has shut down. The results below are from that finished session.",
  ],
};

/** Print each distinct message once, with the frames that locate it. */
function printErrors(errors: LogEvent[]): void {
  const seen = new Set<string>();
  for (const err of errors) {
    const message = str(err.message).trim();
    if (!message || seen.has(message)) continue;
    seen.add(message);
    const after = err.afterMs;
    let timing = "";
    if (err.phase === "interaction" && typeof after === "number") {
      timing = chalk.gray(
        `   (fired ${Math.floor(after / 1000)}s after load -- interaction, not mount)`,
      );
    }
    for (const line of message.split("\n")) {
      console.log(`      ${chalk.red(line)}${timing}`);
      timing = "";
    }
    const stack = Array.isArray(err.stack) ? err.stack : [];
    for (const frame of stack.slice(0, 2)) {
      console.log(chalk.gray(`        ${frame}`));
    }
  }
}

function printReport(report: LogReport): void {
  const logRel = relative(PROJECT_ROOT, LOG_FILE).replace(/\\/g, "/");
  console.log("");
  console.log(chalk.bold("Browser log") + chalk.gray(`  (${logRel})`));
  console.log("=".repeat(60));

  if (report.session === "live") {
    const startedAge = age(report.started);
    const detail =
      `pid ${report.pid}, port ${report.port}, started ${clock(report.started)}` +
      (startedAge ? `, ${startedAge}` : "");
    console.log(`  ${chalk.green("LIVE")}  dev session active ${chalk.gray(`(${detail})`)}`);
  } else {
    const [headline, advice] = SESSION_LINES[report.session];
    const mark = report.session !== "missing" ? chalk.yellow("WARN") : chalk.gray("NONE");
    console.log(`  ${mark}  ${headline}`);
    console.log(chalk.gray(`        ${advice}`));
    if (report.session === "missing") {
      console.log("");
      return;
    }
  }

  console.log("");

  if (report.routes.length === 0) {
    console.log(chalk.yellow("  No page loads recorded yet."));
    console.log(chalk.gray("  The log only knows about routes someone actually opened."));
    console.log(chalk.gray("  An empty log is not evidence that the front end is healthy."));
    console.log("");
    return;
  }

  const sorted = [...report.routes].sort((a, b) => {
    const cleanDiff = Number(isClean(a)) - Number(isClean(b));
    return cleanDiff !== 0 ? cleanDiff : a.route.localeCompare(b.route);
  });

  for (const status of sorted) {
    // Compaction drops load events, so a carried-only route has no load time.
    const when = status.lastLoad
      ? chalk.gray(`last load ${clock(status.lastLoad)} ${age(status.lastLoad)}`)
      : chalk.gray("no load since the last source change");

    if (isClean(status)) {
      const healed = status.healed
        ? chalk.gray(`  (${status.healed} earlier error(s) resolved)`)
        : "";
      const warn = status.warnings.length
        ? chalk.yellow(`  ${status.warnings.length} warning(s)`)
        : "";
      console.log(
        `  ${chalk.green("CLEAN")}  ${chalk.cyan(status.route)}  ${when}${warn}${healed}`,
      );
      continue;
    }

    const label = status.errors.length
      ? status.unconfirmed
        ? "UNCONFIRMED"
        : `${status.errors.length} ERROR(S)`
      : "NEEDS RECHECK";
    const header = `  ${chalk.red(chalk.bold(label))}  ${chalk.cyan(status.route)}`;
    console.log(status.unconfirmed ? header : `${header}  ${when}`);

    if (status.unconfirmed) {
      // No matching load: the reporting tab was opened before this log existed,
      // so the error may already be fixed. Say that plainly rather than sending
      // someone hunting a bug that no longer exists.
      console.log(
        chalk.gray(
          "      Reported by a page loaded before this log started " +
            "(e.g. before the last dev restart).",
        ),
      );
      console.log(
        chalk.gray("      Reload the route and re-run to confirm whether it is still live."),
      );
    }

    printErrors(status.errors);

    if (status.recheck.length) {
      // The critical honesty case: a reload re-runs mount, so it clears a mount
      // error -- but it never clicks a button. Reporting these as CLEAN is how
      // a live bug gets signed off.
      console.log(chalk.gray("      Not re-tested by the reloads since:"));
      printErrors(status.recheck);
      if (status.recheck.some((e) => e.carried)) {
        console.log(
          chalk.gray("      Source changed since these fired; they may already be fixed."),
        );
      }
      console.log(
        chalk.gray("      Repeat the interaction (click/submit) and re-run to confirm."),
      );
    }
  }

  console.log("");
  const failingRoutes = failing(report);
  if (failingRoutes.length) {
    console.log(chalk.red(chalk.bold(`${failingRoutes.length} route(s) failing in the browser.`)));
  } else {
    console.log(chalk.green(chalk.bold("Every route loaded this session is clean.")));
  }
  console.log(chalk.gray("Routes not listed were never opened -- that is no signal, not a pass."));
  console.log("");
}

function toJson(report: LogReport): string {
  return JSON.stringify(
    {
      session: report.session,
      started: report.started,
      pid: report.pid,
      port: report.port,
      lastRestart: report.lastRestart,
      routes: report.routes.map((r) => ({
        route: r.route,
        lastLoad: r.lastLoad,
        clean: isClean(r),
        unconfirmed: r.unconfirmed,
        needsRecheck: r.recheck.map((e) => ({
          message: e.message ?? null,
          phase: e.phase ?? null,
          carried: Boolean(e.carried),
        })),
        errors: r.errors.map((e) => ({
          message: e.message ?? null,
          stack: e.stack ?? null,
        })),
        warnings: r.warnings.map((w) => ({ message: w.message ?? null })),
        healed: r.healed,
      })),
    },
    null,
    2,
  );
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const report = await buildReport();

  if (args.includes("--json")) {
    console.log(toJson(report));
  } else {
    printReport(report);
  }

  // --fail-on-error is off by default: presence of a signal depends on someone
  // opening the page, so this must never become a flaky pass/fail gate.
  if (args.includes("--fail-on-error") && report.session === "live" && failing(report).length) {
    return 1;
  }
  return 0;
}

process.exitCode = await main();
