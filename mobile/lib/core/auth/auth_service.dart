import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../api/api_client.dart';
import '../models/zi_session.dart';

part 'auth_service.g.dart';

final _supabase = Supabase.instance.client;

// ── Auth state provider — tracks Supabase session changes ────────────────────
@riverpod
Stream<AuthState> authState(AuthStateRef ref) {
  return _supabase.auth.onAuthStateChange;
}

// ── ZiSession provider — loaded from /api/v1/auth/session after login ─────────
@riverpod
Future<ZiSession?> ziSession(ZiSessionRef ref) async {
  final authState = await ref.watch(authStateProvider.future);
  if (authState.session == null) return null;
  try {
    final data = await ApiClient.instance.dio.apiGet<Map<String, dynamic>>(
      '/auth/session',
    );
    return ZiSession.fromJson(data as Map<String, dynamic>);
  } catch (_) {
    return null;
  }
}

// ── Auth service class ────────────────────────────────────────────────────────
class AuthService {
  final _client = Supabase.instance.client;

  Future<AuthResponse> signIn({ required String email, required String password }) =>
      _client.auth.signInWithPassword(email: email, password: password);

  Future<AuthResponse> signUp({ required String email, required String password }) =>
      _client.auth.signUp(email: email, password: password);

  Future<void> signOut() => _client.auth.signOut();

  Session? get currentSession => _client.auth.currentSession;
  User?    get currentUser    => _client.auth.currentUser;
}

final authServiceProvider = Provider<AuthService>((ref) => AuthService());
