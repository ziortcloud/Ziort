import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl    = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authServiceProvider).signIn(
        email:    _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
      );
      if (mounted) context.go('/hub');
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 48),

              // Logo mark
              Center(child: _logoMark()),
              const SizedBox(height: 32),

              Text('Welcome back', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 4),
              Text('Sign in to your ZiOrbit account',
                style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 32),

              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.red.withOpacity(0.2)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                ),
                const SizedBox(height: 16),
              ],

              _label('Email'),
              TextField(
                controller:    _emailCtrl,
                keyboardType:  TextInputType.emailAddress,
                autocorrect:   false,
                decoration:    const InputDecoration(hintText: 'you@example.com'),
              ),
              const SizedBox(height: 16),

              _label('Password'),
              TextField(
                controller:  _passwordCtrl,
                obscureText: _obscure,
                decoration: InputDecoration(
                  hintText: '••••••••',
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      size: 18, color: ZiColors.muted),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
              const SizedBox(height: 28),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _signIn,
                  child: _loading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Sign in'),
                ),
              ),
              const SizedBox(height: 20),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text("Don't have an account? ", style: Theme.of(context).textTheme.bodySmall),
                  GestureDetector(
                    onTap: () => context.go('/register'),
                    child: const Text('Create one',
                      style: TextStyle(color: ZiColors.cyan, fontWeight: FontWeight.w600, fontSize: 13)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(text, style: const TextStyle(fontSize: 12, color: ZiColors.muted, fontWeight: FontWeight.w500)),
  );

  Widget _logoMark() => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 36, height: 36,
        decoration: BoxDecoration(
          color:        ZiColors.blue.withOpacity(0.15),
          shape:        BoxShape.circle,
          border:       Border.all(color: ZiColors.cyan.withOpacity(0.4), width: 1.5),
        ),
        child: const Center(
          child: Text('Z', style: TextStyle(color: ZiColors.blue, fontWeight: FontWeight.bold, fontSize: 16)),
        ),
      ),
      const SizedBox(width: 10),
      RichText(text: const TextSpan(
        style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        children: [
          TextSpan(text: 'Zi', style: TextStyle(color: ZiColors.cyan)),
          TextSpan(text: 'Orbit', style: TextStyle(color: ZiColors.white)),
        ],
      )),
    ],
  );
}
