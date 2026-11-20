import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../dung_chung/api.dart';
import '../khach/tro_chuyen.dart';

class TrangQuanTri extends StatefulWidget {
  const TrangQuanTri({super.key, required this.api, required this.access});
  final Api api; final Json access;
  @override State<TrangQuanTri> createState() => _TrangQuanTriState();
}
class _TrangQuanTriState extends State<TrangQuanTri> {
  static const modules = <String,(String,String,IconData)>{
    'tong-quan': ('Tổng quan','/tong-quan',Icons.dashboard_outlined),
    'lich': ('Lịch phòng','/lich-phong',Icons.calendar_month),
    've-sinh': ('Vệ sinh','/ve-sinh',Icons.cleaning_services),
    'tin-nhan': ('Tin nhắn','/chat',Icons.chat_bubble_outline),
    'dat-phong': ('Đơn đặt phòng','/lich-phong/don-dat-phong',Icons.receipt_long),
    'chi-nhanh': ('Chi nhánh','/chi-nhanh',Icons.location_on_outlined),
    'phong': ('Phòng','/phong',Icons.bed_outlined),
    'loai-phong': ('Loại phòng','/loai-phong',Icons.meeting_room_outlined),
    'goi-combo': ('Combo','/combo',Icons.redeem),
    'khach-hang': ('Khách hàng','/khach-hang',Icons.people_outline),
    'nhan-vien': ('Nhân viên','/nhan-vien',Icons.badge_outlined),
    'lich-su': ('Lịch sử','/lich-su',Icons.history),
    'danh-gia': ('Đánh giá','/danh-gia',Icons.star_outline),
    'bao-cao': ('Báo cáo','/bao-cao',Icons.bar_chart),
    'trang-chu': ('Trang chủ','/trang-chu',Icons.home_outlined),
    'chatbot': ('Chatbot','/chatbot',Icons.auto_awesome),
  };
  @override Widget build(BuildContext context) {
    final pages = (widget.access['trang'] as List? ?? []).whereType<String>().where(modules.containsKey).toList();
    return Scaffold(appBar: AppBar(title: const Text('Quản trị')), body: ListView(padding: const EdgeInsets.all(16), children: [for(final key in pages) Card(child: ListTile(leading: Icon(modules[key]!.$3), title: Text(modules[key]!.$1), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => DuLieuQuanTri(api: widget.api, name: modules[key]!.$1, path: modules[key]!.$2, type: key)))))]));
  }
}
class DuLieuQuanTri extends StatefulWidget {
  const DuLieuQuanTri({super.key, required this.api, required this.name, required this.path, required this.type});
  final Api api; final String name,path,type;
  @override State<DuLieuQuanTri> createState() => _DuLieuQuanTriState();
}
class _DuLieuQuanTriState extends State<DuLieuQuanTri> {
  late Future<dynamic> result;
  bool completed = false, busy = false;
  String conversationSearch = '';
  DateTime day = DateTime.now();
  @override void initState() { super.initState(); load(); }
  void load() {
    var path = widget.path;
    if(widget.type == 'lich') {
      final a = DateTime(day.year,day.month,day.day), b = a.add(const Duration(days: 1));
      path += '?bat_dau=${Uri.encodeComponent(a.toUtc().toIso8601String())}&ket_thuc=${Uri.encodeComponent(b.toUtc().toIso8601String())}';
    }
    if (widget.type == 'tin-nhan') {
      path = Uri(path: path, queryParameters: {'tim': conversationSearch.trim()}).toString();
    }
    result = widget.api.request(path, admin: widget.type != 'tin-nhan');
  }
  Future<void> finish(Json task) async {
    final ok = await showDialog<bool>(context: context, builder: (c) => AlertDialog(title: const Text('Hoàn thành vệ sinh?'), content: Text('Phòng ${task['ma_phong']}'), actions: [TextButton(onPressed: () => Navigator.pop(c,false), child: const Text('Quay lại')), FilledButton(onPressed: () => Navigator.pop(c,true), child: const Text('Hoàn thành'))]));
    if(ok != true || !mounted || busy) return;
    setState(() => busy = true);
    try { await widget.api.request('/ve-sinh/${task['id']}', admin: true, method: 'PUT', body: {'hanh_dong':'hoan-thanh'}); if(mounted) setState(load); }
    catch(e) { if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'))); }
    finally { if(mounted) setState(() => busy = false); }
  }
  List<(Json, bool)> calendarEntries(dynamic data, String roomId) {
    if (data is! Map) return [];
    final entries = [
      for (final booking in rows(data['dat_phong']))
        if (booking['phong_id'] == roomId) (booking, false),
      for (final lock in rows(data['khoa']))
        if (lock['phong_id'] == roomId) (lock, true),
    ];
    entries.sort((a, b) => label(a.$1, 'bat_dau').compareTo(label(b.$1, 'bat_dau')));
    return entries;
  }

  String time(dynamic value) { final date = DateTime.tryParse('$value'); return date == null ? '' : DateFormat('dd/MM HH:mm').format(date.toLocal()); }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(widget.name), actions: [IconButton(onPressed: () => setState(load), icon: const Icon(Icons.refresh), tooltip: 'Tải lại')]), body: Column(children: [
    if(widget.type == 've-sinh') Padding(padding: const EdgeInsets.all(12), child: Wrap(spacing: 8, children: [ChoiceChip(label: const Text('Chưa hoàn thành'), selected: !completed, onSelected: (_) => setState(() => completed = false)), ChoiceChip(label: const Text('Hoàn thành'), selected: completed, onSelected: (_) => setState(() => completed = true))])),
    if(widget.type == 'lich') TextButton.icon(onPressed: () async { final v = await showDatePicker(context: context, initialDate: day, firstDate: DateTime(2020), lastDate: DateTime(2040)); if(v != null && mounted) setState(() { day = v; load(); }); }, icon: const Icon(Icons.calendar_month), label: Text(DateFormat('dd/MM/yyyy').format(day))),
    if (widget.type == 'tin-nhan')
      Padding(
        padding: const EdgeInsets.all(16),
        child: TextField(
          decoration: const InputDecoration(
            labelText: 'Tìm hội thoại theo tên',
            prefixIcon: Icon(Icons.search),
          ),
          textInputAction: TextInputAction.search,
          onSubmitted: (value) => setState(() {
            conversationSearch = value;
            load();
          }),
        ),
      ),
    Expanded(child: FutureBuilder<dynamic>(future: result, builder: (context,snapshot) {
      if(snapshot.hasError) return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text('${snapshot.error}')));
      if(!snapshot.hasData) return const Center(child: CircularProgressIndicator());
      final data = snapshot.data;
      var list = data is List ? rows(data) : data is Map ? rows(data['hoi_thoai'] ?? data['du_lieu'] ?? data['items'] ?? data['phong'] ?? data['data']) : <Json>[];
      if(widget.type == 've-sinh') {
        list = list.where((r) => (r['trang_thai'] == 'Hoàn thành') == completed).toList();
        list.sort((a,b) => '${a['tra_phong_luc']}'.compareTo('${b['tra_phong_luc']}'));
      }
      if(list.isEmpty && data is Map && widget.type != 'lich' && widget.type != 'tin-nhan') list = [Map<String,dynamic>.from(data)];
      return ListView(padding: const EdgeInsets.all(16), children: [if(list.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Text('Chưa có dữ liệu.')), for(final row in list) Builder(builder: (_) {
        final out = DateTime.tryParse('${row['tra_phong_luc']}');
        final warning = widget.type == 've-sinh' && !completed && out != null && DateTime.now().difference(out).inMinutes > 30;
        return Card(shape: warning ? RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Colors.orange,width: 2)) : null, child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (widget.type == 've-sinh') ...[
            Text('Phòng ${label(row, 'ma_phong')}', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('Trả phòng: ${time(row['tra_phong_luc'])}'),
            Text(warning ? 'Đã quá 30 phút từ giờ trả phòng' : label(row, 'trang_thai')),
            if (!completed)
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: busy || row['co_the_hoan_thanh'] != true ? null : () => finish(row),
                  child: const Text('Hoàn thành'),
                ),
              ),
          ]
          else if (widget.type == 'tin-nhan')
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(label(row, 'ten_hien_thi', 'Hội thoại')),
              subtitle: Text([
                label(row, 'tin_cuoi'),
                time(row['tin_cuoi_luc']),
              ].where((text) => text.isNotEmpty).join('\n')),
              trailing: Badge(
                isLabelVisible: (int.tryParse(label(row, 'chua_doc')) ?? 0) > 0,
                label: Text(label(row, 'chua_doc')),
                child: const Icon(Icons.chat_bubble_outline),
              ),
              onTap: () async {
                await showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => SizedBox(
                    height: MediaQuery.sizeOf(context).height * .85,
                    child: TroChuyen(
                      api: widget.api,
                      threadId: label(row, 'id'),
                      title: label(row, 'ten_hien_thi', 'Hội thoại'),
                    ),
                  ),
                );
                if (mounted) setState(load);
              },
            )
          else if (widget.type == 'lich') ...[
            Text(label(row, 'ma_phong'), style: Theme.of(context).textTheme.titleLarge),
            Text(label(row, 'ten_homestay')),
            for (final entry in calendarEntries(data, label(row, 'id')))
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(entry.$2 ? Icons.event_busy : Icons.event_available),
                  title: Text(entry.$2
                      ? label(entry.$1, 'ly_do', 'Khóa lịch')
                      : label(entry.$1, 'ten_khach', label(entry.$1, 'ma_dat_phong'))),
                  subtitle: Text([
                    '${time(entry.$1['bat_dau'])} → ${time(entry.$1['ket_thuc'])}',
                    label(entry.$1, entry.$2 ? 'trang_thai_phong' : 'trang_thai'),
                  ].where((text) => text.isNotEmpty).join('\n')),
                ),
              ),
          ]
          else ...[for(final entry in row.entries.where((e) => e.value != null && e.value is! List && e.value is! Map && !e.key.endsWith('_id') && e.key != 'id')) Padding(padding: const EdgeInsets.only(bottom: 6), child: Text('${entry.key.replaceAll('_',' ')}: ${entry.value}'))],
        ])));
      })]);
    })),
  ]));
}
