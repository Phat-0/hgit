import 'package:flutter/material.dart';
import '../dung_chung/api.dart';

class TaiKhoan extends StatefulWidget {
  const TaiKhoan({super.key, required this.api});
  final Api api;
  @override
  State<TaiKhoan> createState() => _TaiKhoanState();
}
class _TaiKhoanState extends State<TaiKhoan> {
  final phone = TextEditingController(), otp = TextEditingController();
  bool busy = false, sent = false;
  String? error;
  Future<dynamic>? orders;
  @override
  void initState() { super.initState(); if (widget.api.token != null) orders = widget.api.request('/don-cua-toi'); }
  @override
  void dispose() { phone.dispose(); otp.dispose(); super.dispose(); }
  Future<void> action() async {
    if (busy) return;
    setState(() { busy = true; error = null; });
    try {
      if (!sent) {
        await widget.api.request('/gui-otp', body: {'so_dien_thoai': phone.text.trim()});
        if (mounted) setState(() => sent = true);
      } else {
        final session = await widget.api.request('/xac-minh-otp', body: {'so_dien_thoai': phone.text.trim(), 'otp': otp.text.trim()});
        widget.api.token = session['access_token'];
        widget.api.guest = null;
        if (mounted) setState(() => orders = widget.api.request('/don-cua-toi'));
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Tài khoản'), actions: [if (widget.api.token != null) IconButton(tooltip: 'Đăng xuất', icon: const Icon(Icons.logout), onPressed: () { widget.api.token = null; widget.api.guest = null; setState(() { orders = null; sent = false; }); })]), body: Align(alignment: Alignment.topCenter, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 700), child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: widget.api.token == null ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [Text('Đăng nhập bằng số điện thoại', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 24), TextField(controller: phone, enabled: !sent && !busy, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Số điện thoại')), const SizedBox(height: 16), if (sent) TextField(controller: otp, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Mã OTP')), if (error != null) Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Text(error!)), const SizedBox(height: 16), FilledButton(onPressed: busy ? null : action, child: Text(busy ? 'Vui lòng chờ…' : sent ? 'Xác nhận' : 'Nhận mã OTP')), if (sent) TextButton(onPressed: busy ? null : () => setState(() { sent = false; otp.clear(); }), child: const Text('Đổi số điện thoại'))]) : FutureBuilder<dynamic>(future: orders, builder: (context, snapshot) {
      if (snapshot.hasError) return Column(children: [Text('${snapshot.error}'), TextButton(onPressed: () => setState(() => orders = widget.api.request('/don-cua-toi')), child: const Text('Thử lại'))]);
      if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
      final value = snapshot.data;
      final list = rows(value is Map ? value['don'] ?? value['don_dat_phong'] : value);
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [Text('Đơn của tôi', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 16), if (list.isEmpty) const Text('Chưa có đơn đặt phòng.'), ...list.map((d) => Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label(d, 'ma_dat_phong'), style: Theme.of(context).textTheme.titleMedium), Text(label(d, 'ten_phong')), Text(label(d, 'trang_thai')), Text('${label(d, 'nhan_phong_luc')} → ${label(d, 'tra_phong_luc')}')]))))]);
    })))));
}
