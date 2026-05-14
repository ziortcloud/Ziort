import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_service.dart';
import '../../../core/models/zi_session.dart';
import '../../../core/theme/app_theme.dart';
import '../data/zipawn_api.dart';

class ZiPawnDashboardScreen extends ConsumerWidget {
  const ZiPawnDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(ziSessionProvider);

    return sessionAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error:   (e, _) => Center(child: Text('Error: $e')),
      data:    (session) => _body(context, ref, session),
    );
  }

  Widget _body(BuildContext context, WidgetRef ref, ZiSession? session) {
    final sub = session?.subscriptionFor('ZPN');
    if (sub == null || session == null) {
      return const Center(child: Text('No ZiPawn subscription', style: TextStyle(color: ZiColors.muted)));
    }

    return FutureBuilder<Map<String, dynamic>>(
      future: ref.read(ziPawnApiProvider).getDashboard(sub.entityId, sub.id),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final data = snapshot.data ?? {};

        final kpis = [
          _Kpi(label: 'Active Loans',   value: '${data['active_loans'] ?? 0}',  icon: Icons.credit_card_outlined, color: ZiColors.blue),
          _Kpi(label: 'Overdue',        value: '${data['overdue_loans'] ?? 0}', icon: Icons.warning_amber_rounded, color: Colors.redAccent),
          _Kpi(label: 'Customers',      value: '${data['total_customers'] ?? 0}', icon: Icons.people_outline, color: ZiColors.cyan),
          _Kpi(label: 'Due Today',      value: '${data['due_today'] ?? 0}',     icon: Icons.schedule,            color: ZiColors.gold),
        ];

        final portfolioPaise = (data['portfolio_paise'] as int? ?? 0);
        final portfolio = portfolioPaise / 100;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // KPI grid
            GridView.count(
              crossAxisCount:  2,
              shrinkWrap:      true,
              physics:         const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.6,
              children: kpis.map((k) => _KpiCard(kpi: k)).toList(),
            ),
            const SizedBox(height: 16),

            // Portfolio
            _statCard(
              icon:  Icons.trending_up,
              label: 'Portfolio Value',
              value: '₹${_fmt(portfolio)}',
              color: ZiColors.blue,
            ),
            const SizedBox(height: 10),
            _statCard(
              icon:  Icons.credit_card,
              label: 'Collected Today',
              value: '₹${_fmt((data['collected_today_paise'] as int? ?? 0) / 100)}',
              color: Colors.greenAccent,
            ),
          ],
        );
      },
    );
  }

  Widget _statCard({required IconData icon, required String label, required String value, required Color color}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color:        ZiColors.deep,
        borderRadius: BorderRadius.circular(14),
        border:       Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: ZiColors.muted)),
              const SizedBox(height: 2),
              Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
            ],
          ),
        ],
      ),
    );
  }

  String _fmt(double v) => v.toStringAsFixed(0).replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
}

class _Kpi {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _Kpi({required this.label, required this.value, required this.icon, required this.color});
}

class _KpiCard extends StatelessWidget {
  final _Kpi kpi;
  const _KpiCard({required this.kpi});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color:        ZiColors.deep,
        borderRadius: BorderRadius.circular(14),
        border:       Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment:  MainAxisAlignment.center,
        children: [
          Icon(kpi.icon, color: kpi.color, size: 20),
          const SizedBox(height: 8),
          Text(kpi.value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: ZiColors.white)),
          Text(kpi.label,  style: const TextStyle(fontSize: 11, color: ZiColors.muted)),
        ],
      ),
    );
  }
}
