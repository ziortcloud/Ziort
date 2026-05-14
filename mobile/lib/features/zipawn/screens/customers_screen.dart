import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_service.dart';
import '../../../core/theme/app_theme.dart';
import '../data/zipawn_api.dart';

class ZiPawnCustomersScreen extends ConsumerStatefulWidget {
  const ZiPawnCustomersScreen({super.key});

  @override
  ConsumerState<ZiPawnCustomersScreen> createState() => _ZiPawnCustomersScreenState();
}

class _ZiPawnCustomersScreenState extends ConsumerState<ZiPawnCustomersScreen> {
  final _searchCtrl = TextEditingController();
  String _search = '';

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(ziSessionProvider);
    return sessionAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error:   (e, _) => Center(child: Text('$e')),
      data:    (session) {
        final sub = session?.subscriptionFor('ZPN');
        if (sub == null) return const Center(child: Text('No subscription'));
        return _body(sub.entityId, sub.id);
      },
    );
  }

  Widget _body(String entityId, String subId) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller:    _searchCtrl,
            onChanged:     (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText:    'Search customers…',
              prefixIcon:  const Icon(Icons.search, size: 18, color: ZiColors.muted),
              suffixIcon:  _search.isNotEmpty
                ? IconButton(icon: const Icon(Icons.clear, size: 16), onPressed: () {
                    _searchCtrl.clear(); setState(() => _search = '');
                  })
                : null,
            ),
          ),
        ),
        Expanded(
          child: FutureBuilder<Map<String, dynamic>>(
            future: ref.read(ziPawnApiProvider).getCustomers(
              entityId, subId, search: _search.isEmpty ? null : _search,
            ),
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final customers = (snap.data?['data'] as List<dynamic>? ?? []);

              if (customers.isEmpty) {
                return Center(child: Text(
                  _search.isNotEmpty ? 'No customers matching "$_search"' : 'No customers yet',
                  style: const TextStyle(color: ZiColors.muted),
                ));
              }

              return ListView.separated(
                padding:          const EdgeInsets.symmetric(horizontal: 16),
                itemCount:        customers.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder:      (ctx, i) {
                  final c = customers[i] as Map<String, dynamic>;
                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color:        ZiColors.deep,
                      borderRadius: BorderRadius.circular(14),
                      border:       Border.all(color: Colors.white.withOpacity(0.07)),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius:          20,
                          backgroundColor: ZiColors.blue.withOpacity(0.15),
                          child: Text(
                            (c['full_name'] as String? ?? '?')[0],
                            style: const TextStyle(color: ZiColors.blue, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(c['full_name'] as String? ?? '—',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: ZiColors.white)),
                              Text(c['zi_code'] as String? ?? '',
                                style: const TextStyle(fontSize: 11, color: ZiColors.muted, fontFamily: 'monospace')),
                            ],
                          ),
                        ),
                        if ((c['active_loans'] as int? ?? 0) > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color:        ZiColors.blue.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('${c['active_loans']} loans',
                              style: const TextStyle(fontSize: 10, color: ZiColors.blue, fontWeight: FontWeight.w600)),
                          ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
