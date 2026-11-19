import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dung_chung/api.dart';
import 'khach/trang_khach.dart';

void main() => runApp(const HomestayApp());
class HomestayApp extends StatefulWidget {
  const HomestayApp({super.key});
  @override
  State<HomestayApp> createState() => _HomestayAppState();
}
class _HomestayAppState extends State<HomestayApp> {
  final api = Api();
  double scale = 1;
  @override
  void initState() { super.initState(); load(); }
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) setState(() => scale = (prefs.getDouble('co_chu') ?? 1).clamp(1.0, 1.5).toDouble());
  }
  Future<void> change(double value) async {
    setState(() => scale = value);
    await (await SharedPreferences.getInstance()).setDouble('co_chu', value);
  }
  @override
  void dispose() { api.close(); super.dispose(); }
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'Homestay', locale: const Locale('vi'),
    supportedLocales: const [Locale('vi')], localizationsDelegates: GlobalMaterialLocalizations.delegates,
    theme: ThemeData(useMaterial3: true, brightness: Brightness.dark, scaffoldBackgroundColor: const Color(0xff251a15), colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xffe9bd80), brightness: Brightness.dark), inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder(), isDense: true)),
    builder: (context, child) {
      final media = MediaQuery.of(context);
      return MediaQuery(data: media.copyWith(textScaler: _AppTextScaler(media.textScaler, scale)), child: child!);
    },
    home: TrangKhach(api: api, scale: scale, onScale: change),
  );
}
class _AppTextScaler extends TextScaler {
  const _AppTextScaler(this.system, this.factor);
  final TextScaler system;
  final double factor;
  @override
  double scale(double fontSize) => system.scale(fontSize) * factor;
  @override
  double get textScaleFactor => system.textScaleFactor * factor;
}
