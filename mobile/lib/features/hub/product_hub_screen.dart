import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/auth_service.dart';
import '../../core/models/zi_session.dart';
import '../../core/theme/app_theme.dart';

// Product definitions — same 19 products as the Vite web app
class _Product {
  final String code;
  final String name;
  final String tagline;
  final IconData icon;
  final String route;
  final Color accent;

  const _Product({
    required this.code, required this.name, required this.tagline,
    required this.icon, required this.route, required this.accent,
  });
}

const _products = [
  _Product(code: 'ZPN',  name: 'ZiPawn',    tagline: 'Gold & jewel pawn management', icon: Icons.diamond_outlined,       route: '/zipawn',    accent: ZiColors.blue),
  _Product(code: 'ZPLS', name: 'ZiPulse',   tagline: 'CRM & sales pipeline',         icon: Icons.bolt_outlined,          route: '/zipulse',   accent: Color(0xFF8B5CF6)),
  _Product(code: 'ZND',  name: 'ZiNeed',    tagline: 'B2B procurement platform',     icon: Icons.shopping_cart_outlined,  route: '/zineed',    accent: Color(0xFFEC4899)),
  _Product(code: 'ZFLT', name: 'ZiFleet',   tagline: 'Fleet & vehicle management',   icon: Icons.local_shipping_outlined, route: '/zifleet',   accent: Color(0xFF06B6D4)),
  _Product(code: 'ZLD',  name: 'ZiLoad',    tagline: 'Goods transport & logistics',  icon: Icons.inventory_2_outlined,   route: '/ziload',    accent: Color(0xFF14B8A6)),
  _Product(code: 'ZFD',  name: 'ZiFood',    tagline: 'Restaurant & kitchen orders',  icon: Icons.restaurant_outlined,    route: '/zifood',    accent: Color(0xFFF97316)),
  _Product(code: 'ZCR',  name: 'ZiCare',    tagline: 'Clinic & patient management',  icon: Icons.favorite_border,        route: '/zicare',    accent: Color(0xFFEF4444)),
  _Product(code: 'ZSHP', name: 'ZiShop',    tagline: 'Retail POS & billing',         icon: Icons.shopping_bag_outlined,  route: '/zishop',    accent: Color(0xFF84CC16)),
];

class ProductHubScreen extends ConsumerWidget {
  const ProductHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(ziSessionProvider);

    return Scaffold(
      appBar: AppBar(
        title: RichText(text: const TextSpan(
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          children: [
            TextSpan(text: 'Zi', style: TextStyle(color: ZiColors.cyan)),
            TextSpan(text: 'Orbit', style: TextStyle(color: ZiColors.white)),
          ],
        )),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_outlined),
            onPressed: () async {
              await ref.read(authServiceProvider).signOut();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: sessionAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error:   (e, _) => Center(child: Text('Error: $e')),
        data:    (session) => _body(context, session),
      ),
    );
  }

  Widget _body(BuildContext context, ZiSession? session) {
    final subscribedCodes = session?.activeSubscriptions.map((s) => s.productCode).toSet() ?? {};
    final enrolled   = _products.where((p) => subscribedCodes.contains(p.code)).toList();
    final unenrolled = _products.where((p) => !subscribedCodes.contains(p.code)).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Greeting
        if (session != null) ...[
          Text(
            'Good ${_timeOfDay()}, ${session.individual.fullName.split(' ').first}',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: ZiColors.white),
          ),
          const SizedBox(height: 4),
          Text(
            session.activeEntity?.entityName ?? '',
            style: const TextStyle(fontSize: 13, color: ZiColors.muted),
          ),
          const SizedBox(height: 24),
        ],

        // Subscribed products
        if (enrolled.isNotEmpty) ...[
          _sectionLabel('YOUR PRODUCTS'),
          const SizedBox(height: 12),
          ...enrolled.map((p) => _ProductCard(product: p, enrolled: true)),
          const SizedBox(height: 24),
        ],

        // Unenrolled — dimmed
        if (unenrolled.isNotEmpty) ...[
          _sectionLabel('EXPLORE MORE'),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount:    2,
            shrinkWrap:        true,
            physics:           const NeverScrollableScrollPhysics(),
            mainAxisSpacing:   10,
            crossAxisSpacing:  10,
            childAspectRatio:  1.8,
            children:          unenrolled.map((p) => _SmallExploreCard(product: p)).toList(),
          ),
        ],
      ],
    );
  }

  Widget _sectionLabel(String text) => Text(
    text,
    style: const TextStyle(fontSize: 10, letterSpacing: 1.5, color: ZiColors.muted, fontWeight: FontWeight.w600),
  );

  String _timeOfDay() {
    final h = DateTime.now().hour;
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }
}

class _ProductCard extends StatelessWidget {
  final _Product product;
  final bool enrolled;

  const _ProductCard({required this.product, required this.enrolled});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enrolled ? () => context.go(product.route) : null,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color:        ZiColors.deep,
          borderRadius: BorderRadius.circular(16),
          border:       Border.all(color: Colors.white.withOpacity(0.07)),
        ),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color:        product.accent.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(product.icon, color: product.accent, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: ZiColors.white)),
                  Text(product.tagline, style: const TextStyle(fontSize: 12, color: ZiColors.muted)),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: ZiColors.muted, size: 18),
          ],
        ),
      ),
    );
  }
}

class _SmallExploreCard extends StatelessWidget {
  final _Product product;
  const _SmallExploreCard({required this.product});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color:        ZiColors.deep,
        borderRadius: BorderRadius.circular(12),
        border:       Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment:  MainAxisAlignment.center,
        children: [
          Icon(product.icon, color: ZiColors.muted, size: 18),
          const SizedBox(height: 8),
          Text(product.name, style: const TextStyle(fontSize: 12, color: ZiColors.muted, fontWeight: FontWeight.w500)),
          Text('Coming soon', style: TextStyle(fontSize: 10, color: ZiColors.muted.withOpacity(0.5))),
        ],
      ),
    );
  }
}
