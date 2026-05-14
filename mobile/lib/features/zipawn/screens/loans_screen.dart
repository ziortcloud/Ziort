import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_service.dart';
import '../../../core/theme/app_theme.dart';
import '../data/zipawn_api.dart';

class ZiPawnLoansScreen extends ConsumerStatefulWidget {
  const ZiPawnLoansScreen({super.key});

  @override
  ConsumerState<ZiPawnLoansScreen> createState() => _ZiPawnLoansScreenState();
}

class _ZiPawnLoansScreenState extends ConsumerState<ZiPawnLoansScreen> {
  String? _status;
  int     _page = 1;

  final _statusTabs = [
    (key: null,       label: 'All'),
    (key: 'active',   label: 'Active'),
    (key: 'overdue',  label: 'Overdue'),
    (key: 'closed',   label: 'Closed'),
  ];

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
        // Status tabs
        Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: _statusTabs.map((t) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => setState(() { _status = t.key; _page = 1; }),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color:        _status == t.key ? ZiColors.blue : ZiColors.deep,
                    borderRadius: BorderRadius.circular(20),
                    border:       Border.all(color: _status == t.key ? ZiColors.blue : Colors.white.withOpacity(0.08)),
                  ),
                  child: Text(t.label, style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w500,
                    color: _status == t.key ? Colors.white : ZiColors.muted,
                  )),
                ),
              ),
            )).toList(),
          ),
        ),

        // Loans list
        Expanded(
          child: FutureBuilder<Map<String, dynamic>>(
            future: ref.read(ziPawnApiProvider).getLoans(
              entityId, subId, status: _status, page: _page, limit: 25,
            ),
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final loans = (snap.data?['data'] as List<dynamic>? ?? []);

              if (loans.isEmpty) {
                return const Center(child: Text('No loans found', style: TextStyle(color: ZiColors.muted)));
              }

              return ListView.separated(
                padding:         const EdgeInsets.all(16),
                itemCount:       loans.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder:     (ctx, i) => _LoanTile(loan: loans[i] as Map<String, dynamic>),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _LoanTile extends StatelessWidget {
  final Map<String, dynamic> loan;
  const _LoanTile({required this.loan});

  @override
  Widget build(BuildContext context) {
    final outstanding = (loan['outstanding_paise'] as int? ?? 0) / 100;
    final status      = loan['status'] as String? ?? '';
    final customer    = (loan['zpn_customers'] as Map?)?['full_name'] ?? '—';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color:        ZiColors.deep,
        borderRadius: BorderRadius.circular(14),
        border:       Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(loan['zi_code'] as String? ?? '—',
                  style: const TextStyle(fontSize: 11, color: ZiColors.cyan, fontFamily: 'monospace')),
                const SizedBox(height: 2),
                Text(customer, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: ZiColors.white)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹${outstanding.toStringAsFixed(0)}',
                style: TextStyle(
                  fontSize: 15, fontWeight: FontWeight.bold,
                  color: status == 'overdue' ? Colors.redAccent : ZiColors.white,
                ),
              ),
              const SizedBox(height: 4),
              _StatusChip(status: status),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'active'  => ('Active',  Colors.greenAccent),
      'overdue' => ('Overdue', Colors.redAccent),
      'closed'  => ('Closed',  ZiColors.muted),
      _         => (status,    ZiColors.muted),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color:        color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
        border:       Border.all(color: color.withOpacity(0.25)),
      ),
      child: Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
    );
  }
}
