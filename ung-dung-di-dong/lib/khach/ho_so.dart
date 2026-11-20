import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../dung_chung/api.dart';

class HoSo extends StatefulWidget {
  const HoSo({super.key, required this.api});
  final Api api;
  @override State<HoSo> createState() => _HoSoState();
}

class _HoSoState extends State<HoSo> {
  final name = TextEditingController();
  final phone = TextEditingController();
  final image = TextEditingController();
  bool busy = true, loaded = false, notices = true;
  String? feedback;

  @override void initState() { super.initState(); load(); }

  Future<void> load() async {
    try {
      final result = await widget.api.request('/ho-so', auth: true);
      final prefs = await SharedPreferences.getInstance();
      if (!mounted) return;
      name.text = label(result, 'ho_ten');
      phone.text = label(result, 'so_dien_thoai');
      image.text = label(result, 'anh_dai_dien');
      setState(() {
        loaded = true;
        notices = prefs.getBool('hien_thong_bao') ?? true;
        feedback = null;
      });
    } catch (error) {
      if (mounted) setState(() => feedback = '$error');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> save() async {
    setState(() { busy = true; feedback = null; });
    try {
      await widget.api.request('/ho-so', auth: true, method: 'PUT', body: {
        'ho_ten': name.text.trim(), 'so_dien_thoai': phone.text.trim(),
        'anh_dai_dien': image.text.trim(),
      });
      if (mounted) setState(() => feedback = 'Đã lưu hồ sơ');
    } catch (error) {
      if (mounted) setState(() => feedback = '$error');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override void dispose() {
    name.dispose(); phone.dispose(); image.dispose(); super.dispose();
  }

  @override Widget build(BuildContext context) {
    final url = Uri.tryParse(image.text);
    return Scaffold(
      appBar: AppBar(title: const Text('Hồ sơ')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        if (busy) const LinearProgressIndicator(),
        if (loaded) ...[
          Center(child: ClipOval(child: SizedBox(width: 88, height: 88,
            child: url?.scheme == 'https'
              ? Image.network(image.text, fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const Icon(Icons.person_outline, size: 44))
              : const Icon(Icons.person_outline, size: 44),
          ))),
          const SizedBox(height: 16),
          TextField(controller: image, enabled: !busy, keyboardType: TextInputType.url,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(labelText: 'Đường dẫn ảnh đại diện (HTTPS)')),
          const SizedBox(height: 12),
          TextField(controller: name, enabled: !busy, decoration: const InputDecoration(labelText: 'Họ tên')),
          const SizedBox(height: 12),
          TextField(controller: phone, enabled: !busy, keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Số điện thoại liên hệ')),
          const SizedBox(height: 16),
          FilledButton(onPressed: busy ? null : save, child: const Text('Lưu hồ sơ')),
          SwitchListTile(title: const Text('Hiện thông báo trong app'), value: notices,
            onChanged: (value) async {
              setState(() => notices = value);
              await (await SharedPreferences.getInstance()).setBool('hien_thong_bao', value);
            }),
        ],
        if (feedback != null) Padding(padding: const EdgeInsets.all(8), child: Text(feedback!)),
        OutlinedButton.icon(onPressed: () => widget.api.token = null,
          label: const Text('Đăng xuất'), icon: const Icon(Icons.logout)),
      ]),
    );
  }
}
