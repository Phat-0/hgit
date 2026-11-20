import 'dart:async';
import 'package:flutter/material.dart';
import '../dung_chung/api.dart';
import 'trang_khach.dart';
import 'tai_khoan.dart';
import '../quan_tri/trang_quan_tri.dart';

class KhungUngDung extends StatefulWidget {
  const KhungUngDung({super.key, required this.api, required this.scale, required this.onScale});
  final Api api;
  final double scale;
  final ValueChanged<double> onScale;
  @override State<KhungUngDung> createState() => _KhungUngDungState();
}
class _KhungUngDungState extends State<KhungUngDung> {
  int page = 0;
  final visited = <int>[0];
  Json? access;
  bool checkingAccess = true, adminMode = false;
  int? cartCount;
  Timer? cartRefresh;

  @override void initState() {
    super.initState();
    loadAccess();
    refreshCart();
    cartRefresh = Timer.periodic(const Duration(seconds: 30), (_) => refreshCart());
  }

  @override void dispose() {
    cartRefresh?.cancel();
    super.dispose();
  }

  Future<void> loadAccess() async {
    try {
      final result = await widget.api.request('/toi', admin: true);
      if (mounted && result is Map && result['duoc_phep'] == true) {
        setState(() {
          access = Map<String, dynamic>.from(result);
          adminMode = true;
        });
      }
    } catch (_) {
      // Accounts without administrative access continue to the guest interface.
    } finally {
      if (mounted) setState(() => checkingAccess = false);
    }
  }

  Future<void> refreshCart() async {
    if (widget.api.token == null) return;
    try {
      final result = await widget.api.request('/gio-hang/so-don');
      if (mounted && result is Map && result['so_don'] is int) {
        setState(() => cartCount = result['so_don'] as int);
      }
    } catch (_) {
      // Keep the last successfully loaded count.
    }
  }

  @override Widget build(BuildContext context) {
    if (checkingAccess) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (adminMode && access != null) {
      return TrangQuanTri(api: widget.api, access: access!,
        onGuest: () => setState(() => adminMode = false));
    }
    return Scaffold(
    body: IndexedStack(
      index: visited.indexOf(page),
      children: [
        for (final section in visited)
          TickerMode(
            key: ValueKey(section), enabled: section == page,
            child: section == 4 ? TaiKhoan(api: widget.api) : TrangKhach(
              api: widget.api, scale: widget.scale, onScale: widget.onScale,
              section: section, onBookingSaved: refreshCart,
              adminAction: access == null ? null : () => setState(() => adminMode = true),
            ),
          ),
      ],
    ),
    bottomNavigationBar: SafeArea(child: Container(decoration: const BoxDecoration(color: Color(0xff37261c), border: Border(top: BorderSide(color: Color(0xff775338)))), padding: const EdgeInsets.symmetric(vertical: 8), child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
      for (var i=0;i<5;i++) Expanded(child: Semantics(selected: page == i, button: true, child: InkWell(onTap: () { setState(() { page = i; if (!visited.contains(i)) visited.add(i); }); refreshCart(); }, borderRadius: BorderRadius.circular(18), child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Column(mainAxisSize: MainAxisSize.min, children: [AnimatedContainer(duration: const Duration(milliseconds: 260), padding: EdgeInsets.all(i == 2 ? 13 : 8), decoration: BoxDecoration(color: i == 2 ? const Color(0xffe9bd80) : page == i ? const Color(0xff67482f) : Colors.transparent, shape: BoxShape.circle), child: Badge(isLabelVisible: i == 4 && cartCount != null, label: Text((cartCount ?? 0) > 99 ? '99+' : '${cartCount ?? 0}'), child: Icon([Icons.home_outlined, Icons.bed_outlined, Icons.add_circle_outline, Icons.redeem, Icons.shopping_bag_outlined][i], size: i == 2 ? 32 : 25, color: i == 2 ? const Color(0xff251a15) : const Color(0xffe9bd80)))), const SizedBox(height: 4), Text(['Trang chủ','Phòng','Đặt phòng','Combo','Giỏ hàng'][i], textAlign: TextAlign.center, style: const TextStyle(fontSize: 11))])))))
    ]))),
    );
  }
}
