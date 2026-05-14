import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/hub/product_hub_screen.dart';
import '../../features/zipawn/screens/zipawn_shell.dart';
import '../../features/zipawn/screens/dashboard_screen.dart';
import '../../features/zipawn/screens/loans_screen.dart';
import '../../features/zipawn/screens/customers_screen.dart';

part 'app_router.g.dart';

@riverpod
GoRouter appRouter(AppRouterRef ref) {
  return GoRouter(
    initialLocation: '/hub',
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final isAuth  = session != null;
      final isAuthRoute = state.matchedLocation.startsWith('/login') ||
                          state.matchedLocation.startsWith('/register');

      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute)   return '/hub';
      return null;
    },
    routes: [
      // ── Auth ──────────────────────────────────────────────────────────────
      GoRoute(path: '/login',    builder: (ctx, _) => const LoginScreen()),
      GoRoute(path: '/register', builder: (ctx, _) => const RegisterScreen()),

      // ── Product Hub ───────────────────────────────────────────────────────
      GoRoute(path: '/hub', builder: (ctx, _) => const ProductHubScreen()),

      // ── ZiPawn standalone workspace (ShellRoute for bottom nav) ───────────
      ShellRoute(
        builder: (ctx, state, child) => ZiPawnShell(child: child),
        routes: [
          GoRoute(path: '/zipawn',            builder: (ctx, _) => const ZiPawnDashboardScreen()),
          GoRoute(path: '/zipawn/loans',      builder: (ctx, _) => const ZiPawnLoansScreen()),
          GoRoute(path: '/zipawn/customers',  builder: (ctx, _) => const ZiPawnCustomersScreen()),
        ],
      ),
    ],
  );
}
