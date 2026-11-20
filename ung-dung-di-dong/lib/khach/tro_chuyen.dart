import 'dart:async';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:uuid/uuid.dart';
import '../dung_chung/api.dart';

class TroChuyen extends StatefulWidget {
  const TroChuyen({super.key, required this.api, this.threadId, this.title});
  final Api api;
  final String? threadId, title;
  @override
  State<TroChuyen> createState() => _TroChuyenState();
}
class _TroChuyenState extends State<TroChuyen> with WidgetsBindingObserver {
  final input = TextEditingController();
  final scroll = ScrollController();
  String? id, error, pendingId, lastReadId;
  String pendingText = '';
  List<Json> messages = [];
  Timer? timer;
  bool sending = false, loading = false, templates = false;
  @override
  void initState() { super.initState(); WidgetsBinding.instance.addObserver(this); start(); }
  Future<void> start() async {
    try {
      final result = widget.threadId != null ? {'id': widget.threadId} : await widget.api.request('/chat', body: {'chi_nhanh_id': null});
      if (!mounted) return;
      id = '${result['id']}';
      widget.api.guest = result['guest_token'] ?? widget.api.guest;
      await refresh();
      if (!mounted) return;
      timer?.cancel(); timer = Timer.periodic(const Duration(seconds: 5), (_) => refresh());
    } catch (e) { if (mounted) setState(() => error = '$e'); }
  }
  Future<void> refresh() async {
    if (id == null || loading) return;
    loading = true;
    try {
      final result = await widget.api.request('/chat/$id/tin-nhan');
      if (mounted) {
        final updated = rows(result['tin_nhan']);
        final changed = updated.isNotEmpty && updated.last['id'] != messages.lastOrNull?['id'];
        setState(() {
          messages = {for (final row in [...messages, ...updated]) row['id']: row}.values.toList();
          error = null;
          templates = result['duoc_dung_mau'] == true;
        });
        final latest = updated.isEmpty ? '' : label(updated.last, 'id');
        if (latest.isNotEmpty && latest != lastReadId) {
          try {
            await widget.api.request('/chat/$id/da-doc', body: {'tin_nhan_id': latest});
            lastReadId = latest;
          } catch (_) {
            // The next refresh can retry the read receipt.
          }
        }
        if (changed && mounted) WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted && scroll.hasClients) scroll.animateTo(scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut); });
      }
    } catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { loading = false; }
  }
  Future<void> send() async {
    final text = input.text.trim();
    if (text.isEmpty || id == null || sending) return;
    if (pendingText != text) { pendingId = const Uuid().v4(); pendingText = text; }
    setState(() => sending = true);
    try { await widget.api.request('/chat/$id/tin-nhan', body: {'noi_dung': text, 'ma_phia_khach': pendingId}); if (!mounted) return; input.clear(); pendingId = null; pendingText = ''; await refresh(); }
    catch (e) { if (mounted) setState(() => error = '$e'); }
    finally { if (mounted) setState(() => sending = false); }
  }
  Future<void> loadOlder() async {
    if (id == null || messages.isEmpty || loading) return;
    loading = true;
    try {
      final before = Uri.encodeQueryComponent(label(messages.first, 'id'));
      final result = await widget.api.request('/chat/$id/tin-nhan?truoc=$before');
      if (!mounted) return;
      setState(() => messages = {
        for (final row in [...rows(result['tin_nhan']), ...messages]) row['id']: row,
      }.values.toList());
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally { loading = false; }
  }

  Future<void> browse(String mode) async {
    if (id == null) return;
    String query = '';
    if (mode == 'tim') {
      query = await showDialog<String>(context: context, builder: (context) => AlertDialog(
        title: const Text('Tìm tin nhắn'),
        content: TextField(autofocus: true, textInputAction: TextInputAction.search,
          onChanged: (text) => query = text,
          onSubmitted: (text) => Navigator.pop(context, text.trim())),
        actions: [TextButton(onPressed: () => Navigator.pop(context, query.trim()), child: const Text('Tìm'))],
      )) ?? '';
      if (query.isEmpty || !mounted) return;
    }
    final path = switch (mode) {
      'tim' => '/tim?tim=${Uri.encodeQueryComponent(query)}',
      'mau' => '/cau-tra-loi',
      _ => '/tep?loai=$mode',
    };
    final data = widget.api.request('/chat/$id$path');
    await showModalBottomSheet<void>(context: context, showDragHandle: true, builder: (context) =>
      FutureBuilder<dynamic>(future: data, builder: (context, snapshot) {
        if (snapshot.hasError) return Center(child: Text('${snapshot.error}'));
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        final items = rows(snapshot.data[mode == 'tim' ? 'tin_nhan' : mode == 'mau' ? 'mau' : 'tep']);
        return ListView(children: [
          if (items.isEmpty) const ListTile(title: Text('Chưa có kết quả')),
          for (final item in items)
            if (mode == 'anh' || mode == 'tep') attachment(item)
            else ListTile(
              title: Text(label(item, mode == 'mau' ? 'noi_dung_da_dien' : 'noi_dung')),
              onTap: mode == 'mau' ? () {
                input.text = label(item, 'noi_dung_da_dien');
                Navigator.pop(context);
              } : null,
            ),
        ]);
      }),
    );
  }

  Widget attachment(Json file) {
    final url = Uri.tryParse(label(file, 'url'));
    if (url?.scheme != 'https') return Text(label(file, 'ten_tep'));
    if (file['la_anh'] == true) {
      return GestureDetector(
        onTap: () => showDialog<void>(context: context, builder: (_) => Dialog(
          child: InteractiveViewer(child: Image.network(url.toString(), fit: BoxFit.contain)),
        )),
        child: Image.network(url.toString(), width: 200, height: 140, fit: BoxFit.cover,
          errorBuilder: (_, _, _) => Text(label(file, 'ten_tep'))),
      );
    }
    return TextButton.icon(
      onPressed: () async {
        try {
          await launchUrl(url!, mode: LaunchMode.externalApplication);
        } catch (e) {
          if (mounted) setState(() => error = 'Không mở được tệp');
        }
      },
      icon: const Icon(Icons.attach_file),
      label: Text(label(file, 'ten_tep', 'Tệp đính kèm')),
    );
  }

  Future<void> attach() async {
    const types = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp',
      'pdf': 'application/pdf', 'txt': 'text/plain', 'csv': 'text/csv',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    if (id == null || sending) return;
    setState(() => sending = true);
    try {
      final choice = await FilePicker.platform.pickFiles(
        type: FileType.custom, allowedExtensions: types.keys.toList(), withData: true,
      );
      final file = choice?.files.single;
      if (!mounted || file == null || file.bytes == null) return;
      final mime = types[file.extension?.toLowerCase()];
      if (mime == null || file.size > 20 * 1024 * 1024) {
        throw const FormatException('Loại tệp không hỗ trợ hoặc lớn hơn 20 MB');
      }
      await widget.api.uploadChat(id!, file.bytes!, file.name, mime, const Uuid().v4(), input.text.trim());
      if (!mounted) return;
      input.clear();
      await refresh();
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    timer?.cancel();
    if (state == AppLifecycleState.resumed && id != null) { refresh(); timer = Timer.periodic(const Duration(seconds: 5), (_) => refresh()); }
  }
  @override
  void dispose() { timer?.cancel(); WidgetsBinding.instance.removeObserver(this); input.dispose(); scroll.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(widget.title ?? 'Hỗ trợ HomeStay'), actions: [
    if (id != null) PopupMenuButton<String>(
      tooltip: 'Công cụ trò chuyện',
      onSelected: (value) => value == 'cu' ? loadOlder() : browse(value),
      itemBuilder: (_) => [
        const PopupMenuItem(value: 'tim', child: Text('Tìm tin nhắn')),
        const PopupMenuItem(value: 'anh', child: Text('Ảnh đã gửi')),
        const PopupMenuItem(value: 'tep', child: Text('Tệp đã gửi')),
        const PopupMenuItem(value: 'cu', child: Text('Tải tin cũ')),
        if (templates) const PopupMenuItem(value: 'mau', child: Text('Câu trả lời mẫu')),
      ],
    ),
  ]), body: SafeArea(child: Column(children: [
    if (error != null) Padding(padding: const EdgeInsets.all(12), child: Row(children: [Expanded(child: Text(error!)), TextButton(onPressed: id == null ? start : refresh, child: const Text('Thử lại'))])),
    Expanded(child: id == null && error == null ? const Center(child: CircularProgressIndicator()) : ListView.builder(controller: scroll, padding: const EdgeInsets.all(16), itemCount: messages.length, itemBuilder: (context, i) { final m = messages[i]; final own = m['cua_toi'] == true; return Align(alignment: own ? Alignment.centerRight : Alignment.centerLeft, child: ConstrainedBox(constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .85), child: Card(color: own ? const Color(0xff68472c) : null, child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label(m, 'ten_nguoi_gui'), style: Theme.of(context).textTheme.labelSmall), const SizedBox(height: 6), SelectableText(label(m, 'noi_dung')), if (m['tep'] is Map) attachment(Map<String, dynamic>.from(m['tep'] as Map))]))))); })),
    Padding(padding: const EdgeInsets.all(12), child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [IconButton(onPressed: sending || id == null ? null : attach, tooltip: 'Gửi tệp', icon: const Icon(Icons.attach_file)), Expanded(child: TextField(controller: input, enabled: !sending, minLines: 1, maxLines: 5, maxLength: 4000, decoration: const InputDecoration(hintText: 'Nhắn tin với CSKH', counterText: ''))), const SizedBox(width: 8), IconButton.filled(onPressed: sending || id == null ? null : send, tooltip: 'Gửi tin nhắn', icon: const Icon(Icons.send))])),
  ])));
}
