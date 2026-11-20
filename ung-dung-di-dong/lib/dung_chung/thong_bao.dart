import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';

class NutThongBao extends StatelessWidget {
  const NutThongBao({super.key, required this.api});
  final Api api;

  Future<void> open(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    if (!context.mounted) return;
    if (!(prefs.getBool('hien_thong_bao') ?? true)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thông báo đang tắt trong Hồ sơ')));
      return;
    }
    final data = api.request('/thong-bao');
    await showModalBottomSheet<void>(
      context: context, showDragHandle: true,
      builder: (context) => SafeArea(child: FutureBuilder<dynamic>(
        future: data,
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text('${snapshot.error}'));
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final items = rows(snapshot.data);
          return ListView(children: [
            const ListTile(title: Text('Thông báo')),
            if (items.isEmpty) const ListTile(title: Text('Chưa có thông báo')),
            for (final item in items) ListTile(
              leading: Icon(item['da_doc_luc'] == null ? Icons.notifications_active_outlined : Icons.notifications_none),
              title: Text(label(item, 'tieu_de')),
              subtitle: Text(label(item, 'noi_dung')),
              onTap: () async {
                try {
                  await api.request('/thong-bao/${item['id']}/doc', method: 'PUT');
                  if (context.mounted) Navigator.pop(context);
                } catch (error) {
                  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
                }
              },
            ),
          ]);
        },
      )),
    );
  }

  @override Widget build(BuildContext context) => IconButton(
    tooltip: 'Thông báo', icon: const Icon(Icons.notifications_none),
    onPressed: () => open(context),
  );
}
