import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dung_chung/api.dart';
import 'khach/tai_khoan.dart';
import 'khach/khung_ung_dung.dart';

void main() => runApp(const HomestayApp());
class HomestayApp extends StatefulWidget {
  const HomestayApp({super.key});
  @override
  State<HomestayApp> createState() => _HomestayAppState();
}
class _HomestayAppState extends State<HomestayApp> {
  final api = Api();
  final navigator = GlobalKey<NavigatorState>();
  double scale = 1;
  @override
  void initState() { super.initState(); api.addListener(sessionChanged); load(); }
  void sessionChanged() {
    if (api.token == null) navigator.currentState?.popUntil((route) => route.isFirst);
    if (mounted) setState(() {});
  }
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) setState(() => scale = (prefs.getDouble('co_chu') ?? 1).clamp(1.0, 1.5).toDouble());
  }
  Future<void> change(double value) async {
    setState(() => scale = value);
    await (await SharedPreferences.getInstance()).setDouble('co_chu', value);
  }
  @override
  void dispose() { api.removeListener(sessionChanged); api.close(); super.dispose(); }
  @override
  Widget build(BuildContext context) => MaterialApp(
    navigatorKey: navigator,
    debugShowCheckedModeBanner: false,
    title: 'Homestay', locale: const Locale('vi'),
    supportedLocales: const [Locale('vi')], localizationsDelegates: GlobalMaterialLocalizations.delegates,
    theme: ThemeData(useMaterial3: true, brightness: Brightness.dark, scaffoldBackgroundColor: const Color(0xff251a15), colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xffe9bd80), brightness: Brightness.dark), inputDecorationTheme: InputDecorationTheme(border: OutlineInputBorder(borderRadius: BorderRadius.circular(18)), isDense: true)),
    builder: (context, child) {
      final media = MediaQuery.of(context);
      return MediaQuery(data: media.copyWith(textScaler: _AppTextScaler(media.textScaler, scale)), child: child!);
    },
    home: api.token == null ? TaiKhoan(api: api) : KhungUngDung(api: api, scale: scale, onScale: change),
  );
}
class _AppTextScaler extends TextScaler {
  const _AppTextScaler(this.system, this.factor);
  final TextScaler system;
  final double factor;
  @override
  double scale(double fontSize) => system.scale(fontSize) * factor;
  @override
  double get textScaleFactor => scale(14) / 14;
}
