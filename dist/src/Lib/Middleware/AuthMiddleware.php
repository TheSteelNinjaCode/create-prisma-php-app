<?php

namespace Lib\Middleware;

use Lib\Auth\Auth;
use Lib\Auth\AuthConfig;
use Lib\Request;

final class AuthMiddleware
{
    public static function handle($requestPathname)
    {
        $requestPathname = trim($requestPathname);
        if (!self::matches($requestPathname)) {
            return;
        }

        // Check if the user is authorized to access the route or redirect to login
        if (!self::isAuthorized()) {
            Request::redirect('/auth/login');
        }

        // Check if the user has the required role to access the route or redirect to denied
        if (AuthConfig::IS_ROLE_BASE && !self::hasRequiredRole($requestPathname)) {
            Request::redirect('/denied');
        }
    }

    protected static function matches($requestPathname)
    {
        foreach (AuthConfig::$privateRoutes ?? [] as $pattern) {
            if (self::getUriRegex($pattern, $requestPathname)) {
                return true;
            }
        }
        return false;
    }

    protected static function isAuthorized(): bool
    {
        $auth = Auth::getInstance();
        $cookieName = Auth::COOKIE_NAME;
        if (!isset($_COOKIE[$cookieName])) {
            unset($_SESSION[Auth::PAYLOAD_SESSION_KEY]);
            return false;
        }

        $jwt = $_COOKIE[$cookieName];

        if (AuthConfig::IS_TOKEN_AUTO_REFRESH) {
            $jwt = $auth->refreshToken($jwt);
            $verifyToken = $auth->verifyToken($jwt);
        }

        $verifyToken = $auth->verifyToken($jwt);
        if ($verifyToken === false) {
            return false;
        }

        // Access the PAYLOAD_NAME property using the -> operator instead of array syntax
        if (isset($verifyToken->{Auth::PAYLOAD_NAME})) {
            return true;
        }

        return false;
    }

    protected static function hasRequiredRole($requestPathname): bool
    {
        $auth = Auth::getInstance();
        $roleBasedRoutes = AuthConfig::$roleBasedRoutes ?? [];
        foreach ($roleBasedRoutes as $pattern => $data) {
            if (self::getUriRegex($pattern, $requestPathname)) {
                $userRole = Auth::ROLE_NAME ? $auth->getPayload()[Auth::ROLE_NAME] : $auth->getPayload();
                if ($userRole !== null && AuthConfig::checkAuthRole($userRole, $data[AuthConfig::ROLE_IDENTIFIER])) {
                    return true;
                }
            }
        }
        return false;
    }

    private static function getUriRegex($pattern, $requestPathname)
    {
        $pattern = strtolower($pattern);
        $requestPathname = strtolower(trim($requestPathname));

        // Handle the case where the requestPathname is empty, which means home or "/"
        if (empty($requestPathname) || $requestPathname === '/') {
            $requestPathname = '/';
        } else {
            $requestPathname = "/" . $requestPathname;
        }

        $regex = "#^/?" . preg_quote($pattern, '#') . "(/.*)?$#";
        return preg_match($regex, $requestPathname);
    }
}
