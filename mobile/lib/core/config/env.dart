// Environment configuration — values injected via --dart-define at build time
// flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=... --dart-define=API_URL=...
class Env {
  static const supabaseUrl =
      String.fromEnvironment('SUPABASE_URL', defaultValue: 'https://jzkkxsvzunarysvurmtd.supabase.co');
  static const supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  // In dev: http://10.0.2.2:3000 (Android emulator → localhost)
  // In prod: https://api.ziorbit.com (same Next.js API the web app uses)
  static const apiUrl =
      String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000');
}
