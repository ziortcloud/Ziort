import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/env.dart';

// Singleton Dio instance configured to hit the same /api/v1/* REST endpoints
// that the Vite web app uses — 100% code reuse at the API level.
class ApiClient {
  ApiClient._();
  static final ApiClient _instance = ApiClient._();
  static ApiClient get instance => _instance;

  late final Dio _dio = _buildDio();

  Dio get dio => _dio;

  Dio _buildDio() {
    final dio = Dio(BaseOptions(
      baseUrl:         '${Env.apiUrl}/api/v1',
      connectTimeout:  const Duration(seconds: 15),
      receiveTimeout:  const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
    ));

    // ── Attach Supabase JWT as Bearer token ───────────────────────────────
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final session = Supabase.instance.client.auth.currentSession;
        if (session != null) {
          options.headers['Authorization'] = 'Bearer ${session.accessToken}';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // 401 → try refreshing the session then retry once
        if (error.response?.statusCode == 401) {
          try {
            final refreshed = await Supabase.instance.client.auth.refreshSession();
            if (refreshed.session != null) {
              final token = refreshed.session!.accessToken;
              error.requestOptions.headers['Authorization'] = 'Bearer $token';
              final cloned = await dio.fetch(error.requestOptions);
              handler.resolve(cloned);
              return;
            }
          } catch (_) {}
          // Session dead — caller handles redirect to login
        }
        handler.next(error);
      },
    ));

    return dio;
  }
}

// ── Typed helpers (same shape as the Vite web apiGet/apiPost) ─────────────────
extension ApiHelpers on Dio {
  Future<T> apiGet<T>(String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await get(path, queryParameters: queryParameters);
    final data = (res.data as Map<String, dynamic>)['data'];
    return fromJson != null ? fromJson(data) : data as T;
  }

  Future<T> apiPost<T>(String path, {
    dynamic body,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await post(path, data: body);
    final data = (res.data as Map<String, dynamic>)['data'];
    return fromJson != null ? fromJson(data) : data as T;
  }

  Future<T> apiPatch<T>(String path, {
    dynamic body,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await patch(path, data: body);
    final data = (res.data as Map<String, dynamic>)['data'];
    return fromJson != null ? fromJson(data) : data as T;
  }

  Future<void> apiDelete(String path) async {
    await delete(path);
  }
}
