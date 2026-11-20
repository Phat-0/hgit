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
  Json? access;
  @override void initState() { super.initState(); loadAccess(); }
  Future<void> loadAccess() async { try { final result = await widget.api.request('/toi', admin: true); if (mounted) setState(() => access = Map<String,dynamic>.from(result)); } catch (_) {} }
  @override Widget build(BuildContext context) => Scaffold(
    body: page == 4 ? TaiKhoan(api: widget.api) : TrangKhach(key: ValueKey(page), api: widget.api, scale: widget.scale, onScale: widget.onScale, section: page, adminAction: access == null ? null : () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => TrangQuanTri(api: widget.api, access: access!)))),
    bottomNavigationBar: SafeArea(child: Container(decoration: const BoxDecoration(color: Color(0xff37261c), border: Border(top: BorderSide(color: Color(0xff775338)))), padding: const EdgeInsets.symmetric(vertical: 8), child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
      for (var i=0;i<5;i++) Expanded(child: Semantics(selected: page == i, button: true, child: InkWell(onTap: () => setState(() => page = i), borderRadius: BorderRadius.circular(18), child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Column(mainAxisSize: MainAxisSize.min, children: [AnimatedContainer(duration: const Duration(milliseconds: 260), padding: EdgeInsets.all(i == 2 ? 13 : 8), decoration: BoxDecoration(color: i == 2 ? const Color(0xffe9bd80) : page == i ? const Color(0xff67482f) : Colors.transparent, shape: BoxShape.circle), child: Icon([Icons.home_outlined, Icons.bed_outlined, Icons.add_circle_outline, Icons.redeem, Icons.shopping_bag_outlined][i], size: i == 2 ? 32 : 25, color: i == 2 ? const Color(0xff251a15) : const Color(0xffe9bd80))), const SizedBox(height: 4), Text(['Trang chủ','Phòng','Đặt phòng','Combo','Giỏ hàng'][i], textAlign: TextAlign.center, style: const TextStyle(fontSize: 11))])))))
    ]))),
  );
}
