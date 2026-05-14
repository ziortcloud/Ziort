// ZiPawn API service — calls the SAME /api/v1/* endpoints as the Vite web app.
// This is the key advantage of Option 2: one API, many clients.
import '../../../core/api/api_client.dart';
import '../models/loan.dart';
import '../models/customer.dart';

class ZiPawnApi {
  final _dio = ApiClient.instance.dio;

  String _base(String entityId, String subId) =>
      '/entities/$entityId/zipawn/$subId';

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getDashboard(String entityId, String subId) =>
      _dio.apiGet<Map<String, dynamic>>('${_base(entityId, subId)}/dashboard');

  // ─── Loans ─────────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getLoans(
    String entityId, String subId, {
    String? status, int page = 1, int limit = 25,
  }) =>
      _dio.apiGet<Map<String, dynamic>>(
        '${_base(entityId, subId)}/loans',
        queryParameters: {
          if (status != null) 'status': status,
          'page': page, 'limit': limit,
        },
      );

  Future<Map<String, dynamic>> getLoan(String entityId, String subId, String loanId) =>
      _dio.apiGet<Map<String, dynamic>>('${_base(entityId, subId)}/loans/$loanId');

  Future<Map<String, dynamic>> renewLoan(
    String entityId, String subId, String loanId, Map<String, dynamic> body,
  ) =>
      _dio.apiPost<Map<String, dynamic>>('${_base(entityId, subId)}/loans/$loanId/renew', body: body);

  Future<Map<String, dynamic>> closeLoan(
    String entityId, String subId, String loanId, Map<String, dynamic> body,
  ) =>
      _dio.apiPost<Map<String, dynamic>>('${_base(entityId, subId)}/loans/$loanId/close', body: body);

  // ─── Customers ─────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getCustomers(
    String entityId, String subId, {
    String? search, int page = 1, int limit = 30,
  }) =>
      _dio.apiGet<Map<String, dynamic>>(
        '${_base(entityId, subId)}/customers',
        queryParameters: {
          if (search != null && search.isNotEmpty) 'search': search,
          'page': page, 'limit': limit,
        },
      );

  Future<Map<String, dynamic>> getCustomer(String entityId, String subId, String customerId) =>
      _dio.apiGet<Map<String, dynamic>>('${_base(entityId, subId)}/customers/$customerId');

  Future<Map<String, dynamic>> createCustomer(
    String entityId, String subId, Map<String, dynamic> body,
  ) =>
      _dio.apiPost<Map<String, dynamic>>('${_base(entityId, subId)}/customers', body: body);

  // ─── Schemes ───────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getSchemes(String entityId, String subId) =>
      _dio.apiGet<Map<String, dynamic>>('${_base(entityId, subId)}/schemes');
}

// Riverpod provider
import 'package:riverpod_annotation/riverpod_annotation.dart';
part 'zipawn_api.g.dart';

@riverpod
ZiPawnApi ziPawnApi(ZiPawnApiRef ref) => ZiPawnApi();
