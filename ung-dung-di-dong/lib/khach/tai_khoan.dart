import 'package:flutter/material.dart';
import '../dung_chung/api.dart';

class TaiKhoan extends StatefulWidget {
  const TaiKhoan({super.key, required this.api});
  final Api api;
  @override
  State<TaiKhoan> createState() => _TaiKhoanState();
}
class _TaiKhoanState extends State<TaiKhoan> with SingleTickerProviderStateMixin {
  late final AnimationController motion = AnimationController(vsync: this, duration: const Duration(seconds: 16))..repeat(reverse: true);
  final email = TextEditingController(), password = TextEditingController();
  bool useEmail = false, remember = true, registering = false;
  String? notice;
  final phone = TextEditingController(), otp = TextEditingController();
  bool busy = false, sent = false;
  String? error;
  Future<dynamic>? orders;
  @override
  void initState() { super.initState(); if (widget.api.token != null) orders = widget.api.request('/don-cua-toi'); }
  @override
  void dispose() { motion.dispose(); email.dispose(); password.dispose(); phone.dispose(); otp.dispose(); super.dispose(); }
  @override
  void didChangeDependencies() { super.didChangeDependencies(); if(MediaQuery.of(context).disableAnimations) { motion.stop(); } else if(!motion.isAnimating) { motion.repeat(reverse: true); } }
  Future<void> action() async {
    if (busy) return;
    setState(() { busy = true; error = null; });
    try {
      if (useEmail) {
        final session = await widget.api.request(registering ? '/dang-ky' : '/dang-nhap', auth: true,
          body: {'email': email.text.trim(), 'matKhau': password.text});
        if (registering) {
          if (mounted) setState(() {
            registering = false;
            notice = label(session, 'thong_bao');
            password.clear();
          });
          return;
        }
        await widget.api.signIn(Map<String, dynamic>.from(session as Map), remember: remember);
        if (mounted) setState(() => orders = widget.api.request('/don-cua-toi'));
      } else if (!sent) {
        await widget.api.request('/gui-otp', body: {'so_dien_thoai': phone.text.trim()});
        if (mounted) setState(() => sent = true);
      } else {
        final session = await widget.api.request('/xac-minh-otp', body: {'so_dien_thoai': phone.text.trim(), 'otp': otp.text.trim()});
        await widget.api.signIn(Map<String, dynamic>.from(session as Map), remember: remember);
        widget.api.guest = null;
        if (mounted) setState(() => orders = widget.api.request('/don-cua-toi'));
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Tài khoản'), actions: [if (widget.api.token != null) IconButton(tooltip: 'Đăng xuất', icon: const Icon(Icons.logout), onPressed: () { widget.api.token = null; widget.api.guest = null; setState(() { orders = null; sent = false; }); })]), body: Stack(children: [Positioned.fill(child: AnimatedBuilder(animation: motion, builder: (context, _) => DecoratedBox(decoration: BoxDecoration(gradient: RadialGradient(center: Alignment(-1 + motion.value * 2, -.5 + motion.value), radius: 1.4, colors: const [Color(0xff916037), Color(0xff251a15)]))))), Align(alignment: Alignment.topCenter, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 700), child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: widget.api.token == null ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [const Icon(Icons.home_outlined, size: 48), const SizedBox(height: 16), Text(registering ? 'Đăng ký' : 'Đăng nhập', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 24), Wrap(spacing: 8, runSpacing: 8, children: [ChoiceChip(label: const Text('Điện thoại'), selected: !useEmail, onSelected: busy ? null : (_) => setState(() {useEmail = false; registering = false; error = null;})), ChoiceChip(label: const Text('Email'), selected: useEmail, onSelected: busy ? null : (_) => setState(() {useEmail = true; error = null;}))]), const SizedBox(height: 16), if (useEmail) ...[TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email')), const SizedBox(height: 12), TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Mật khẩu'))] else TextField(controller: phone, enabled: !sent && !busy, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Số điện thoại')), const SizedBox(height: 16), if (sent && !useEmail) TextField(controller: otp, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Mã OTP')), if (notice != null) Text(notice!), if (!registering) CheckboxListTile(contentPadding: EdgeInsets.zero, title: const Text('Ghi nhớ đăng nhập'), value: remember, onChanged: busy ? null : (value) => setState(() => remember = value ?? false)), if (error != null) Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Text(error!)), const SizedBox(height: 16), FilledButton(onPressed: busy ? null : action, child: Text(busy ? 'Vui lòng chờ…' : registering ? 'Đăng ký' : useEmail ? 'Đăng nhập' : sent ? 'Xác nhận' : 'Nhận mã OTP')), TextButton(onPressed: busy ? null : () => setState(() {
      registering = !registering;
      useEmail = true;
      error = null;
      notice = null;
    }), child: Text(registering ? 'Quay lại đăng nhập' : 'Tạo tài khoản')), if (sent && !useEmail) TextButton(onPressed: busy ? null : () => setState(() { sent = false; otp.clear(); }), child: const Text('Đổi số điện thoại'))]) : FutureBuilder<dynamic>(future: orders, builder: (context, snapshot) {
      if (snapshot.hasError) return Column(children: [Text('${snapshot.error}'), TextButton(onPressed: () => setState(() => orders = widget.api.request('/don-cua-toi')), child: const Text('Thử lại'))]);
      if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
      final value = snapshot.data;
      final list = rows(value is Map ? value['don'] ?? value['don_dat_phong'] : value);
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [Text('Đơn của tôi', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 16), if (list.isEmpty) const Text('Chưa có đơn đặt phòng.'), ...list.map((d) => Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label(d, 'ma_dat_phong'), style: Theme.of(context).textTheme.titleMedium), Text(label(d, 'ten_phong')), Text(label(d, 'trang_thai')), Text('${label(d, 'nhan_phong_luc')} → ${label(d, 'tra_phong_luc')}')]))))]);
    }))))]));
}
