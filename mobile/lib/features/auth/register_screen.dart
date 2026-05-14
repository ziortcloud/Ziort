import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _emailCtrl    = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = false;
  bool _sent    = false;
  String? _error;

  @override
  void dispose() { _emailCtrl.dispose(); _passwordCtrl.dispose(); super.dispose(); }

  Future<void> _signUp() async {
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authServiceProvider).signUp(
        email: _emailCtrl.text.trim(), password: _passwordCtrl.text,
      );
      setState(() { _sent = true; });
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_sent) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.mark_email_read_outlined, size: 64, color: ZiColors.cyan),
                const SizedBox(height: 20),
                Text('Check your email', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Text('We sent a verification link to your email.',
                  style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
                const SizedBox(height: 24),
                TextButton(onPressed: () => context.go('/login'),
                  child: const Text('Back to login', style: TextStyle(color: ZiColors.cyan))),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/login')),
        title: const Text('Create account'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),
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
              const Text('Email', style: TextStyle(fontSize: 12, color: ZiColors.muted, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              TextField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(hintText: 'you@example.com')),
              const SizedBox(height: 16),
              const Text('Password', style: TextStyle(fontSize: 12, color: ZiColors.muted, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              TextField(controller: _passwordCtrl, obscureText: true,
                decoration: const InputDecoration(hintText: 'Min. 8 characters')),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _signUp,
                  child: _loading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Create account'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
