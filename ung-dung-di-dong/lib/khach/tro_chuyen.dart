import 'dart:async';
import 'package:flutter/material.dart';
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
  bool sending = false, loading = false;
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
        final changed = updated.length != messages.length || (updated.isNotEmpty && messages.isNotEmpty && updated.last['id'] != messages.last['id']);
        setState(() { messages = updated; error = null; });
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
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    timer?.cancel();
    if (state == AppLifecycleState.resumed && id != null) { refresh(); timer = Timer.periodic(const Duration(seconds: 5), (_) => refresh()); }
  }
  @override
  void dispose() { timer?.cancel(); WidgetsBinding.instance.removeObserver(this); input.dispose(); scroll.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(widget.title ?? 'Hỗ trợ HomeStay')), body: SafeArea(child: Column(children: [
    if (error != null) Padding(padding: const EdgeInsets.all(12), child: Row(children: [Expanded(child: Text(error!)), TextButton(onPressed: id == null ? start : refresh, child: const Text('Thử lại'))])),
    Expanded(child: id == null && error == null ? const Center(child: CircularProgressIndicator()) : ListView.builder(controller: scroll, padding: const EdgeInsets.all(16), itemCount: messages.length, itemBuilder: (context, i) { final m = messages[i]; final own = m['cua_toi'] == true; return Align(alignment: own ? Alignment.centerRight : Alignment.centerLeft, child: ConstrainedBox(constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * .85), child: Card(color: own ? const Color(0xff68472c) : null, child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label(m, 'ten_nguoi_gui'), style: Theme.of(context).textTheme.labelSmall), const SizedBox(height: 6), SelectableText(label(m, 'noi_dung')), if (m['tep'] != null) const Text('Tin nhắn có tệp đính kèm · Xem trên website')]))))); })),
    Padding(padding: const EdgeInsets.all(12), child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [Expanded(child: TextField(controller: input, enabled: !sending, minLines: 1, maxLines: 5, maxLength: 4000, decoration: const InputDecoration(hintText: 'Nhắn tin với CSKH', counterText: ''))), const SizedBox(width: 8), IconButton.filled(onPressed: sending || id == null ? null : send, tooltip: 'Gửi tin nhắn', icon: const Icon(Icons.send))])),
  ])));
}
