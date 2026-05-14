import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ZiOrbit dark theme — mirrors the Tailwind colors in ziorbit-web/tailwind.config.ts
class ZiColors {
  static const midnight = Color(0xFF0D0E14); // orbit-midnight
  static const deep     = Color(0xFF13151F); // orbit-deep
  static const navy     = Color(0xFF1C1E2E); // orbit-navy
  static const blue     = Color(0xFF6D6ADE); // zi-blue
  static const cyan     = Color(0xFF38BDF8); // zi-cyan
  static const gold     = Color(0xFFF59E0B); // zi-gold
  static const white    = Color(0xFFE2E8F0); // zi-white
  static const muted    = Color(0xFF64748B); // zi-muted
}

class AppTheme {
  static ThemeData get dark => ThemeData(
    useMaterial3:   true,
    brightness:     Brightness.dark,
    scaffoldBackgroundColor: ZiColors.midnight,
    colorScheme: ColorScheme.dark(
      surface:    ZiColors.deep,
      primary:    ZiColors.blue,
      secondary:  ZiColors.cyan,
      tertiary:   ZiColors.gold,
      onSurface:  ZiColors.white,
      outline:    Colors.white.withOpacity(0.08),
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
      bodyLarge:   TextStyle(color: ZiColors.white,  fontSize: 14),
      bodyMedium:  TextStyle(color: ZiColors.white,  fontSize: 13),
      bodySmall:   TextStyle(color: ZiColors.muted,  fontSize: 12),
      labelSmall:  TextStyle(color: ZiColors.muted,  fontSize: 10, letterSpacing: 1.2, fontWeight: FontWeight.w600),
      titleMedium: TextStyle(color: ZiColors.white,  fontSize: 16, fontWeight: FontWeight.w600),
      titleLarge:  TextStyle(color: ZiColors.white,  fontSize: 20, fontWeight: FontWeight.bold),
    ),
    cardTheme: CardTheme(
      color:   ZiColors.deep,
      elevation: 0,
      shape:   RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side:         BorderSide(color: Colors.white.withOpacity(0.06)),
      ),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: ZiColors.deep,
      elevation:       0,
      surfaceTintColor: Colors.transparent,
      titleTextStyle:  GoogleFonts.inter(
        fontSize: 16, fontWeight: FontWeight.w600, color: ZiColors.white,
      ),
      iconTheme: const IconThemeData(color: ZiColors.muted),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled:          true,
      fillColor:       ZiColors.navy,
      contentPadding:  const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border:          OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide:   BorderSide(color: Colors.white.withOpacity(0.08)),
      ),
      enabledBorder:   OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide:   BorderSide(color: Colors.white.withOpacity(0.08)),
      ),
      focusedBorder:   OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide:   const BorderSide(color: ZiColors.cyan, width: 1.5),
      ),
      hintStyle:       TextStyle(color: ZiColors.muted.withOpacity(0.5), fontSize: 13),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor:    ZiColors.blue,
        foregroundColor:    Colors.white,
        elevation:          0,
        shape:              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        padding:            const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        textStyle:          const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor:      ZiColors.deep,
      selectedItemColor:    ZiColors.cyan,
      unselectedItemColor:  ZiColors.muted,
      type:                 BottomNavigationBarType.fixed,
      elevation:            0,
    ),
  );
}
