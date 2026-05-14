import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

// Bottom nav shell for the ZiPawn standalone workspace
// Mirrors the ZiPawn Sidebar sections from the web app
class ZiPawnShell extends StatelessWidget {
  final Widget child;
  const ZiPawnShell({super.key, required this.child});

  static const _tabs = [
    (icon: Icons.dashboard_outlined,      label: 'Dashboard',  route: '/zipawn'),
    (icon: Icons.credit_card_outlined,    label: 'Loans',      route: '/zipawn/loans'),
    (icon: Icons.people_outline,          label: 'Customers',  route: '/zipawn/customers'),
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/hub'),
        ),
        title: RichText(text: const TextSpan(
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          children: [
            TextSpan(text: 'Zi', style: TextStyle(color: ZiColors.cyan)),
            TextSpan(text: 'Pawn', style: TextStyle(color: ZiColors.white)),
          ],
        )),
        actions: [
          IconButton(
            icon: const Icon(Icons.calculate_outlined),
            tooltip: 'Quick Calculator',
            onPressed: () => _showCalculator(context),
          ),
          IconButton(
            icon: const Icon(Icons.person_add_outlined),
            tooltip: 'Add Customer',
            onPressed: () => context.go('/zipawn/customers'),
          ),
        ],
      ),
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xFF1C1E2E))),
        ),
        child: BottomNavigationBar(
          currentIndex: _tabIndex(location),
          onTap: (i) => context.go(_tabs[i].route),
          items: _tabs.map((t) => BottomNavigationBarItem(
            icon:  Icon(t.icon),
            label: t.label,
          )).toList(),
        ),
      ),
    );
  }

  int _tabIndex(String location) {
    if (location.startsWith('/zipawn/loans'))     return 1;
    if (location.startsWith('/zipawn/customers')) return 2;
    return 0;
  }

  void _showCalculator(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: ZiColors.deep,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => const _PawnCalculatorSheet(),
    );
  }
}

class _PawnCalculatorSheet extends StatefulWidget {
  const _PawnCalculatorSheet();

  @override
  State<_PawnCalculatorSheet> createState() => _PawnCalculatorSheetState();
}

class _PawnCalculatorSheetState extends State<_PawnCalculatorSheet> {
  final _weightCtrl  = TextEditingController();
  final _rateCtrl    = TextEditingController();
  final _purityCtrl  = TextEditingController(text: '91.6');
  double? _marketValue;
  double? _loanAmount;

  void _calculate() {
    final w = double.tryParse(_weightCtrl.text) ?? 0;
    final r = double.tryParse(_rateCtrl.text)   ?? 0;
    final p = (double.tryParse(_purityCtrl.text) ?? 91.6) / 100;
    setState(() {
      _marketValue = w * r * p;
      _loanAmount  = _marketValue! * 0.75;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Quick Pawn Calculator', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ZiColors.white)),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: _field('Weight (g)', _weightCtrl)),
            const SizedBox(width: 12),
            Expanded(child: _field('Rate (₹/g)', _rateCtrl)),
            const SizedBox(width: 12),
            Expanded(child: _field('Purity %', _purityCtrl)),
          ]),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(onPressed: _calculate, child: const Text('Calculate')),
          ),
          if (_marketValue != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: ZiColors.midnight, borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _resultItem('Market Value', '₹${_marketValue!.toStringAsFixed(0)}', ZiColors.white),
                  _resultItem('Est. Loan (75%)', '₹${_loanAmount!.toStringAsFixed(0)}', ZiColors.gold),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _field(String label, TextEditingController ctrl) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(fontSize: 11, color: ZiColors.muted)),
      const SizedBox(height: 6),
      TextField(
        controller:   ctrl,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        style:        const TextStyle(fontSize: 13),
        decoration:   const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10)),
      ),
    ],
  );

  Widget _resultItem(String label, String value, Color color) => Column(
    children: [
      Text(label, style: const TextStyle(fontSize: 11, color: ZiColors.muted)),
      const SizedBox(height: 4),
      Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color)),
    ],
  );
}
