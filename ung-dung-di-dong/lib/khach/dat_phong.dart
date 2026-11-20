import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/cupertino.dart' show CupertinoPicker;
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';
import '../dung_chung/api.dart';
import 'trang_khach.dart';

class DatPhong extends StatefulWidget {
  const DatPhong({super.key, required this.api, required this.room, this.initialCombo, this.initialQuantity = 1});
  final Api api;
  final Json room;
  final Json? initialCombo;
  final int initialQuantity;
  @override
  State<DatPhong> createState() => _DatPhongState();
}
class _DatPhongState extends State<DatPhong> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController(), phone = TextEditingController(), note = TextEditingController(), voucher = TextEditingController();
  final quantities = <String, int>{};
  Iterable<String> get selectedCombos => quantities.keys;
  bool unavailable = false;
  double early = 0, lateHours = 0;
  int guests = 1;
  String? kind;
  DateTime start = DateTime.now().add(const Duration(minutes: 30));
  DateTime end = DateTime.now().add(const Duration(hours: 3));
  Json? config, quote;
  String? error;
  bool busy = false;
  int revision = 0;
  String? requestKey;
  Timer? debounce;
  @override
  void initState() { super.initState(); load(); }
  Future<void> load() async {
    try {
      final result = await widget.api.request('/cau-hinh');
      if (!mounted) return;
      setState(() => config = Map<String, dynamic>.from(result));
      final defaultKind = widget.room['cho_dat_theo_gio'] != false
          ? 'Theo giờ'
          : widget.room['cho_dat_theo_dem'] != false
              ? 'Theo đêm'
              : 'Theo ngày';
      selectKind(defaultKind);
      if (widget.initialCombo != null) {
        final id = label(widget.initialCombo!, 'id');
        quantities[id] = widget.initialQuantity;
        changed();
      }
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    }
  }
  @override
  void dispose() { debounce?.cancel(); name.dispose(); phone.dispose(); note.dispose(); voucher.dispose(); super.dispose(); }
  Json payload() => {'phong_id': widget.room['id'], 'bat_dau': start.subtract(Duration(minutes: (early * 60).round())).toUtc().toIso8601String(), 'ket_thuc': end.add(Duration(minutes: (lateHours * 60).round())).toUtc().toIso8601String(), 'hinh_thuc_dat': kind, 'combo_ids': selectedCombos.toList(), 'combo_so_luong': {...quantities}, 'ma_voucher': voucher.text.trim(), 'gio_nhan_som': early, 'gio_tra_muon': lateHours};
  void changed() {
    requestKey = null;
    final current = ++revision;
    debounce?.cancel();
    setState(() { quote = null; error = null; unavailable = false; });
    if (kind == null || !end.isAfter(start)) return;
    debounce = Timer(const Duration(milliseconds: 350), () async {
      try { final value = await widget.api.request('/bao-gia', body: payload()); if (mounted && current == revision) setState(() => quote = Map<String, dynamic>.from(value)); }
      catch (e) { if (mounted && current == revision) setState(() { error = '$e'; unavailable = e is ApiError && e.status == 409; }); }
    });
  }
  void selectKind(String value) {
    final hours = config?['khung_gio'] is Map ? config!['khung_gio'] as Map : <String, dynamic>{};
    DateTime timeAt(DateTime day, dynamic raw, int fallback) { final parts = '${raw ?? '$fallback:00'}'.split(':'); return DateTime(day.year, day.month, day.day, int.tryParse(parts[0]) ?? fallback, parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0); }
    setState(() {
      kind = value;
      early = 0; lateHours = 0; quantities.clear();
      if (value == 'Theo giờ') {
        final now = DateTime.now();
        start = DateTime(now.year, now.month, now.day, now.hour, ((now.minute ~/ 30) + 1) * 30);
        end = start.add(Duration(hours: int.tryParse('${widget.room['so_gio_toi_thieu']}') ?? 2));
      } else {
        final night = value == 'Theo đêm';
        start = timeAt(start, hours[night ? 'dem_tu' : 'ngay_tu'], night ? 21 : 14);
        end = timeAt(start.add(const Duration(days: 1)), hours[night ? 'dem_den' : 'ngay_den'], 12);
      }
    });
    changed();
  }
  Future<void> choose(bool first, {bool clockOnly = false}) async {
    if (busy) return;
    final now = DateTime.now();
    final initial = first ? start : end;
    final date = clockOnly ? DateTime(initial.year, initial.month, initial.day) : await showDatePicker(context: context, initialDate: initial.isBefore(now) ? now : initial, firstDate: DateTime(now.year, now.month, now.day), lastDate: now.add(const Duration(days: 180)));
    if (date == null || !mounted) return;
    var selected = DateTime(date.year, date.month, date.day, initial.hour, initial.minute);
    if (kind == 'Theo giờ' && clockOnly) {
      final hours = config?['khung_gio'] as Map? ?? {};
      int minutes(dynamic raw, int fallback) { final parts = '$raw'.split(':'); return (int.tryParse(parts.first) ?? fallback) * 60 + (parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0); }
      final open = minutes(hours['gio_tu'], 8), close = minutes(hours['gio_den'], 22);
      final times = <int>[for (var m = 0; m < 1440; m += 30) if (open < close ? m >= open && m <= close : m >= open || m <= close) m];
      if (times.isEmpty) return;
      var index = times.indexWhere((m) => m >= initial.hour * 60 + initial.minute);
      if (index < 0) index = 0;
      final controller = FixedExtentScrollController(initialItem: index);
      final minute = await showModalBottomSheet<int>(context: context, showDragHandle: true, builder: (context) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [SizedBox(height: 200, child: CupertinoPicker(scrollController: controller, itemExtent: 50, onSelectedItemChanged: (n) => index = n, children: times.map((m) => Center(child: Text('${(m ~/ 60).toString().padLeft(2, '0')}:${(m % 60).toString().padLeft(2, '0')}'))).toList())), Padding(padding: const EdgeInsets.all(16), child: FilledButton(onPressed: () => Navigator.pop(context, times[index]), child: const Text('Chọn giờ')))])));
      controller.dispose();
      if (minute == null || !mounted) return;
      selected = DateTime(date.year, date.month, date.day, minute ~/ 60, minute % 60);
    }
    setState(() { if (first) { start = selected; if (!end.isAfter(start)) end = start.add(Duration(hours: kind == 'Theo giờ' ? 2 : 24)); } else { end = selected; } });
    changed();
  }
  Future<void> selectCombos() async {
    setState(() => busy = true);
    try {
      final options = rows(await widget.api.request('/combo', body: payload()));
      if (!mounted) return;
      final available = {for (final combo in options) label(combo, 'id'): combo};
      final draft = {
        for (final entry in quantities.entries)
          if (available.containsKey(entry.key)) entry.key: entry.value,
      };
      int limit(String id) => available[id]?['so_gio_bao_gom'] == null ? 20 : 1;
      final result = await showDialog<Map<String, int>>(
        context: context,
        builder: (context) => StatefulBuilder(
          builder: (context, update) => AlertDialog(
            title: const Text('Combo'),
            scrollable: true,
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (options.isEmpty) const Text('Chưa có combo phù hợp.'),
                for (final entry in available.entries) ...[
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(label(entry.value, 'ten_combo')),
                    subtitle: Text(money(entry.value['gia_combo'])),
                    value: draft.containsKey(entry.key),
                    onChanged: (checked) => update(() {
                      if (checked != true) {
                        draft.remove(entry.key);
                        return;
                      }
                      if (limit(entry.key) == 1) {
                        draft.removeWhere((id, _) => limit(id) == 1);
                      }
                      if (draft.length < 10) draft[entry.key] = 1;
                    }),
                  ),
                  if (draft.containsKey(entry.key) && limit(entry.key) > 1)
                    TextFormField(
                      key: ValueKey(entry.key),
                      initialValue: '${draft[entry.key]}',
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(labelText: 'Số lượng (1–20)'),
                      onChanged: (text) => update(() {
                        draft[entry.key] = int.tryParse(text) ?? 0;
                      }),
                    ),
                ],
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
              FilledButton(
                onPressed: draft.entries.any((entry) =>
                    entry.value < 1 || entry.value > limit(entry.key))
                    ? null
                    : () => Navigator.pop(context, draft),
                child: const Text('Áp dụng'),
              ),
            ],
          ),
        ),
      );
      if (mounted && result != null) {
        quantities
          ..clear()
          ..addAll(result);
        changed();
      }
    } catch (e) {
      if (mounted) setState(() {
        error = '$e';
        unavailable = e is ApiError && e.status == 409;
      });
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> showConflict() => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Giờ không khả dụng'),
      content: const Text('Lịch của bạn đã được đặt, xin vui lòng chọn lại.'),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Đóng'))],
    ),
  );

  Future<void> submit() async {
    if (unavailable) {
      await showConflict();
      return;
    }
    if (busy || !form.currentState!.validate() || quote == null || kind == null) return;
    if (widget.api.token == null) return;
    requestKey ??= const Uuid().v4();
    setState(() { busy = true; error = null; });
    try {
      final result = await widget.api.request('/app/dat-phong', body: {...payload(), 'ten_khach': name.text.trim(), 'so_dien_thoai': phone.text.trim(), 'so_khach': guests, 'ghi_chu': note.text.trim(), 'khoa_yeu_cau': requestKey});
      if (!mounted) return;
      await showDialog<void>(context: context, barrierDismissible: false, builder: (context) => AlertDialog(title: const Text('Đã gửi yêu cầu'), content: Text('Mã đơn: ${result['ma_dat_phong']}\n${result['trang_thai']}'), actions: [FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Đóng'))]));
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = '$e';
        unavailable = e is ApiError && e.status == 409;
      });
      if (unavailable) await showConflict();
    }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Đặt phòng'), actions: [if (unavailable) const Padding(padding: EdgeInsets.all(12), child: Tooltip(message: 'Phòng không thể đặt', child: Icon(Icons.event_busy, color: Colors.orange)))]), body: Align(alignment: Alignment.topCenter, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 760), child: SingleChildScrollView(padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.viewInsetsOf(context).bottom + 24), child: Form(key: form, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    Text(label(widget.room, 'ten_phong'), style: Theme.of(context).textTheme.titleLarge), if(unavailable) const Text('Giờ không khả dụng', style: TextStyle(color: Colors.orange)), const SizedBox(height: 20),
    TextFormField(controller: name, enabled: !busy, decoration: const InputDecoration(labelText: 'Họ tên'), validator: (v) => (v?.trim().length ?? 0) < 2 ? 'Nhập họ tên' : null, onChanged: (_) => requestKey = null), const SizedBox(height: 12),
    TextFormField(controller: phone, enabled: !busy, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Số điện thoại'), validator: (v) => RegExp(r'^(0|\+84|84)[0-9]{9}$').hasMatch((v ?? '').replaceAll(' ', '')) ? null : 'Nhập số điện thoại hợp lệ', onChanged: (_) => requestKey = null), const SizedBox(height: 12),
    Wrap(spacing: 8, runSpacing: 8, children: [for (final entry in [('Theo giờ', 'Giờ', 'cho_dat_theo_gio'), ('Theo đêm', 'Đêm', 'cho_dat_theo_dem'), ('Theo ngày', 'Ngày', 'cho_dat_theo_ngay')]) if (widget.room[entry.$3] != false) ChoiceChip(label: Text(entry.$2), selected: kind == entry.$1, onSelected: busy || config == null ? null : (_) => selectKind(entry.$1))]), const SizedBox(height: 16),
    Wrap(spacing: 12, runSpacing: 12, children: [OutlinedButton.icon(onPressed: kind == null || busy ? null : () => choose(true), icon: const Icon(Icons.login), label: Text('Ngày nhận: ${DateFormat('dd/MM/yyyy').format(start)}')), OutlinedButton.icon(onPressed: kind == null || busy ? null : () => choose(false), icon: const Icon(Icons.logout), label: Text('Ngày trả: ${DateFormat('dd/MM/yyyy').format(end)}'))]),
    if (kind == 'Theo giờ') Wrap(spacing: 12, children: [OutlinedButton(onPressed: busy ? null : () => choose(true, clockOnly: true), child: Text('Giờ nhận ${DateFormat('HH:mm').format(start)}')), OutlinedButton(onPressed: busy ? null : () => choose(false, clockOnly: true), child: Text('Giờ trả ${DateFormat('HH:mm').format(end)}'))]),
    if (kind != null) ...[
      if (kind != 'Theo giờ') ...[TextFormField(enabled: !busy, key: ValueKey('extra-$kind-early'), initialValue: '0', keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Check-in sớm (giờ)'), validator: (v) => int.tryParse(v ?? '') == null || (int.tryParse(v ?? '') ?? 0) < 0 || (int.tryParse(v ?? '') ?? 0) > 12 ? 'Nhập số nguyên 0–12' : null, onChanged: (v) { early = (int.tryParse(v) ?? 0).clamp(0,12).toDouble(); changed(); }), const SizedBox(height: 12), TextFormField(enabled: !busy, key: ValueKey('extra-$kind-late'), initialValue: '0', keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Check-out muộn (giờ)'), validator: (v) => int.tryParse(v ?? '') == null || (int.tryParse(v ?? '') ?? 0) < 0 || (int.tryParse(v ?? '') ?? 0) > 12 ? 'Nhập số nguyên 0–12' : null, onChanged: (v) { lateHours = (int.tryParse(v) ?? 0).clamp(0,12).toDouble(); changed(); })],
      OutlinedButton(onPressed: busy ? null : selectCombos, child: Text('Combo (${selectedCombos.length})')),
      const SizedBox(height: 12), TextFormField(controller: voucher, enabled: !busy, decoration: const InputDecoration(labelText: 'Voucher'), onChanged: (_) => changed()),
      const SizedBox(height: 12), DropdownButtonFormField<int>(initialValue: guests, decoration: const InputDecoration(labelText: 'Số khách'), items: [for (var n = 1; n <= (int.tryParse('${widget.room['suc_chua']}') ?? 2); n++) DropdownMenuItem(value: n, child: Text('$n khách'))], onChanged: busy ? null : (v) { setState(() => guests = v ?? 1); requestKey = null; }),
    ],
    TextFormField(controller: note, enabled: !busy, maxLines: 3, maxLength: 2000, decoration: const InputDecoration(labelText: 'Ghi chú'), onChanged: (_) => requestKey = null), const SizedBox(height: 16),
    if (error != null) Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error))),
    if (quote != null) Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Tiền phòng: ${money(quote!['tien_phong'])}'), Text('Phụ thu: ${money(quote!['tien_phu_thu'])}'), const Divider(), Text('Tổng: ${money(quote!['tong_tien'])}', style: Theme.of(context).textTheme.titleLarge)]))),
    const SizedBox(height: 16), FilledButton(onPressed: busy || (quote == null && !unavailable) ? null : submit, child: Padding(padding: const EdgeInsets.all(8), child: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Gửi yêu cầu đặt phòng'))),
  ]))))));
}
