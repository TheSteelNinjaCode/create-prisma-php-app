<?php use Lib\Request; ?>

<div class="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
    <main class="flex flex-col gap-5 row-start-2 items-center sm:items-center">
        <h1 class="text-6xl font-bold tracking-tight">
            <span class="text-black">PRISMA</span>
            <span class="text-black text-2xl align-super">PHP</span>
        </h1>

        <ol class="list-inside list-decimal text-sm/6 text-center sm:text-left">
            <li class="mb-2 tracking-[-.01em]">
                Get started by editing
                <code class="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-semibold">
                    src/app/index.php
                </code>
                .
            </li>
            <li class="tracking-[-.01em]">
                Save and see your changes instantly.
            </li>
        </ol>

        <div class="w-full flex items-center justify-center gap-4 sm:gap-6">
            <a
                class="rounded-full border border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                href="https://prismaphp.tsnc.tech/docs"
                target="_blank"
                rel="noopener noreferrer">
                <img src="<?= Request::baseUrl ?>/assets/images/prisma-php-black.svg" alt="Read Docs" width="20" height="20" style="filter: invert(1) sepia(1) hue-rotate(180deg);" /> Read Docs
            </a>
        </div>
    </main>

    <footer class="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
            class="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="https://prismaphp.tsnc.tech/docs?doc=learning-path"
            target="_blank"
            rel="noopener noreferrer">
            <img
                aria-hidden="true"
                src="<?= Request::baseUrl ?>/assets/images/file.svg"
                alt="File icon"
                width="16"
                height="16" /> Learn
        </a>
        <a
            class="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="https://prismaphp.tsnc.tech/docs?doc=todo-app"
            target="_blank"
            rel="noopener noreferrer">
            <img
                aria-hidden="true"
                src="<?= Request::baseUrl ?>/assets/images/window.svg"
                alt="File icon"
                width="16"
                height="16" /> Examples
        </a>
        <a
            class="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="https://prismaphp.tsnc.tech/"
            target="_blank"
            rel="noopener noreferrer">
            <img
                aria-hidden="true"
                src="<?= Request::baseUrl ?>/assets/images/globe.svg"
                alt="File icon"
                width="16"
                height="16" /> prismaphp.tsnc.tech →
        </a>
    </footer>
</div>