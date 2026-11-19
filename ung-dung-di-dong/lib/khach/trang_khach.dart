import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../dung_chung/api.dart';
import '../dung_chung/chuyen_dong.dart';
import 'dat_phong.dart';
import 'tro_chuyen.dart';
import 'tai_khoan.dart';

String money(dynamic value) => '${NumberFormat.decimalPattern('vi').format(num.tryParse('$value') ?? 0)} đ';
List<String> photos(Json item) => (item['anh'] is List ? item['anh'] as List : []).whereType<String>().where((e) => e.startsWith('http')).toList();
Widget photo(String? url, {BoxFit fit = BoxFit.cover}) => url == null || url.isEmpty ? const ColoredBox(color: Color(0xff493225), child: Center(child: Icon(Icons.bed_outlined, size: 54))) : Image.network(url, fit: fit, errorBuilder: (_, __, ___) => const ColoredBox(color: Color(0xff493225), child: Center(child: Icon(Icons.image_not_supported_outlined))));

class TrangKhach extends StatefulWidget {
  const TrangKhach({super.key, required this.api, required this.scale, required this.onScale});
  final Api api;
  final double scale;
  final ValueChanged<double> onScale;
  @override
  State<TrangKhach> createState() => _TrangKhachState();
}
class _TrangKhachState extends State<TrangKhach> {
  late Future<List<dynamic>> data;
  String branch = '';
  int tab = 0;
  @override
  void initState() { super.initState(); reload(); }
  void reload() { data = Future.wait([widget.api.request('/gioi-thieu'), widget.api.request('/trang-chu')]); }
  void settings() => showModalBottomSheet<void>(context: context, showDragHandle: true, builder: (context) => SafeArea(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Cỡ chữ', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 16), Wrap(spacing: 8, children: [1.0, 1.15, 1.3, 1.5].map((s) => ChoiceChip(label: Text('${(s * 100).round()}%'), selected: widget.scale == s, onSelected: (_) { widget.onScale(s); Navigator.pop(context); })).toList()), const SizedBox(height: 16), const Text('Cỡ chữ của hệ thống vẫn được giữ. App tự điều chỉnh bố cục khi chữ lớn hơn.')]))));
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('HomeStay'), actions: [IconButton(onPressed: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => TaiKhoan(api: widget.api))), icon: const Icon(Icons.person_outline), tooltip: 'Tài khoản và đơn của tôi'), IconButton(onPressed: settings, icon: const Icon(Icons.text_fields), tooltip: 'Cỡ chữ')]),
    floatingActionButton: FloatingActionButton(onPressed: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => TroChuyen(api: widget.api))), tooltip: 'Chat với CSKH', child: const Icon(Icons.chat_bubble_outline)),
    body: FutureBuilder<List<dynamic>>(future: data, builder: (context, snapshot) {
      if (snapshot.hasError) return Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [Text('${snapshot.error}', textAlign: TextAlign.center), const SizedBox(height: 16), FilledButton(onPressed: () => setState(reload), child: const Text('Thử lại'))])));
      if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
      final catalog = Map<String, dynamic>.from(snapshot.data![0] as Map);
      final cms = Map<String, dynamic>.from(snapshot.data![1] as Map);
      final hero = cms['hero'] is Map ? Map<String, dynamic>.from(cms['hero']) : <String, dynamic>{};
      final ui = cms['giao_dien'] is Map ? Map<String, dynamic>.from(cms['giao_dien']) : <String, dynamic>{};
      final rooms = rows(catalog['phong']);
      final combos = rows(catalog['combo']);
      final branches = rows(catalog['chi_nhanh']);
      final shown = (tab == 0 ? rooms : combos).where((p) => branch.isEmpty || (tab == 0 ? p['homestay_id'] == branch : p['pham_vi'] == 'toan_he_thong' || (p['chi_nhanh_ids'] is List && (p['chi_nhanh_ids'] as List).contains(branch)))).toList();
      final stats = catalog['thong_ke'] is Map ? Map<String, dynamic>.from(catalog['thong_ke']) : <String, dynamic>{};
      return RefreshIndicator(onRefresh: () async { setState(reload); await data; }, child: CustomScrollView(slivers: [
        SliverToBoxAdapter(child: _Hero(heading: label(hero, 'tieu_de', 'Đổi không gian. Chạm cảm hứng.'), description: label(hero, 'noi_dung'), image: label(hero, 'anh_nen', label(hero, 'anh', rooms.isNotEmpty && photos(rooms.first).isNotEmpty ? photos(rooms.first).first : '')), name: label(ui, 'ten_web', 'HomeStay'))),
        SliverPadding(padding: const EdgeInsets.all(20), sliver: SliverToBoxAdapter(child: HienDan(child: Wrap(spacing: 24, runSpacing: 16, children: [for (final entry in [('Chi nhánh', stats['so_homestay']), ('Phòng', stats['so_phong']), ('Lượt khách', stats['luot_khach'])]) Column(mainAxisSize: MainAxisSize.min, children: [Text('${entry.$2 ?? 0}', style: Theme.of(context).textTheme.headlineMedium), Text(entry.$1)])])))),
        SliverPadding(padding: const EdgeInsets.symmetric(horizontal: 20), sliver: SliverToBoxAdapter(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 8, runSpacing: 8, children: [ChoiceChip(label: const Text('Phòng & giá'), selected: tab == 0, onSelected: (_) => setState(() => tab = 0)), ChoiceChip(label: const Text('Combo'), selected: tab == 1, onSelected: (_) => setState(() => tab = 1))]),
          const SizedBox(height: 16), DropdownButtonFormField<String>(value: branch, isExpanded: true, decoration: const InputDecoration(labelText: 'Chi nhánh'), items: [const DropdownMenuItem(value: '', child: Text('Tất cả chi nhánh')), ...branches.map((b) => DropdownMenuItem(value: label(b, 'id'), child: Text(label(b, 'ten_homestay', label(b, 'ten')), overflow: TextOverflow.ellipsis)))], onChanged: (v) => setState(() => branch = v ?? '')),
          const SizedBox(height: 16), if (shown.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Text('Chưa có dữ liệu phù hợp.')),
        ]))),
        SliverPadding(padding: const EdgeInsets.symmetric(horizontal: 20), sliver: SliverLayoutBuilder(builder: (context, constraints) {
          final textSize = MediaQuery.textScalerOf(context).scale(14) / 14;
          final width = constraints.crossAxisExtent;
          final count = width >= 1000 && textSize < 1.5 ? 3 : width >= 650 && textSize < 1.7 ? 2 : 1;
          return SliverList(delegate: SliverChildBuilderDelegate((context, index) {
            final slice = shown.skip(index * count).take(count).toList();
            return Padding(padding: const EdgeInsets.only(bottom: 16), child: AnimatedSwitcher(duration: const Duration(milliseconds: 420), transitionBuilder: (child, animation) => FadeTransition(opacity: animation, child: SlideTransition(position: Tween(begin: const Offset(.03, 0), end: Offset.zero).animate(animation), child: child)), child: Row(key: ValueKey('$tab-$branch-$index'), crossAxisAlignment: CrossAxisAlignment.start, children: [for (var n = 0; n < count; n++) Expanded(child: n >= slice.length ? const SizedBox() : Padding(padding: EdgeInsets.only(right: n == count - 1 ? 0 : 16), child: HienDan(child: _Card(item: slice[n], combo: tab == 1, onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => ChiTiet(api: widget.api, item: slice[n], combo: tab == 1)))))))])));
          }, childCount: (shown.length / count).ceil()));
        })),
        SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.fromLTRB(20, 20, 20, 96), child: HienDan(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Khách hàng nói về homestay', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 16), for (final review in rows(catalog['danh_gia']).take(3)) Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${label(review, 'ten_khach')} · ${label(review, 'so_sao')} ★'), const SizedBox(height: 8), Text(label(review, 'noi_dung'))])))])))),
      ]));
    }),
  );
}

class _Hero extends StatelessWidget {
  const _Hero({required this.heading, required this.description, required this.image, required this.name});
  final String heading, description, image, name;
  @override
  Widget build(BuildContext context) => Stack(children: [Positioned.fill(child: photo(image)), Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.black.withValues(alpha: .15), const Color(0xff251a15)])))), Padding(padding: const EdgeInsets.fromLTRB(24, 110, 24, 48), child: HienDan(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 700), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(name.toUpperCase(), style: const TextStyle(letterSpacing: 3, color: Color(0xffe9bd80))), const SizedBox(height: 18), Text(heading, style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontFamily: 'serif', height: 1.2)), const SizedBox(height: 18), Text(description, style: const TextStyle(height: 1.6))]))))]);
}
class _Card extends StatelessWidget {
  const _Card({required this.item, required this.combo, required this.onTap});
  final Json item;
  final bool combo;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(clipBehavior: Clip.antiAlias, margin: EdgeInsets.zero, child: InkWell(onTap: onTap, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AspectRatio(aspectRatio: 1.5, child: photo(photos(item).firstOrNull)), Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label(item, combo ? 'ten_combo' : 'ten_phong', label(item, 'ma_phong')), style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: 8), Text(combo ? money(item['gia_combo']) : 'Giờ ${money(item['gia_moi_gio'])} · Đêm ${money(item['gia_moi_dem'])}', style: const TextStyle(color: Color(0xffe9bd80))), const SizedBox(height: 8), Text(combo ? 'Xem chi tiết combo' : label(item, 'ten_homestay')), const SizedBox(height: 8), const Row(children: [Text('Xem chi tiết'), SizedBox(width: 8), Icon(Icons.arrow_forward, size: 18)])]))])));
}

class ChiTiet extends StatelessWidget {
  const ChiTiet({super.key, required this.api, required this.item, required this.combo});
  final Api api;
  final Json item;
  final bool combo;
  @override
  Widget build(BuildContext context) {
    final images = photos(item);
    return Scaffold(appBar: AppBar(title: Text(label(item, combo ? 'ten_combo' : 'ten_phong'))), body: SingleChildScrollView(padding: const EdgeInsets.all(20), child: LayoutBuilder(builder: (context, box) {
      final gallery = Column(children: [AspectRatio(aspectRatio: 1.15, child: PageView(children: [for (final image in images) GestureDetector(onTap: () => Navigator.push(context, MaterialPageRoute<void>(fullscreenDialog: true, builder: (_) => Scaffold(appBar: AppBar(title: const Text('Ảnh phòng')), body: PageView(controller: PageController(initialPage: images.indexOf(image)), children: [for (final src in images) InteractiveViewer(minScale: 1, maxScale: 4, child: Center(child: photo(src, fit: BoxFit.contain)))])))), child: ClipRRect(borderRadius: BorderRadius.circular(20), child: photo(image))), if (images.isEmpty) photo(null)])), if (images.length > 1) const Padding(padding: EdgeInsets.all(12), child: Text('Vuốt xem ảnh · Chạm để phóng to'))]);
      final info = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label(item, combo ? 'ten_combo' : 'ten_phong'), style: Theme.of(context).textTheme.headlineMedium), const SizedBox(height: 20), if (combo) Text(money(item['gia_combo'])) else ...[Text('Theo giờ: ${money(item['gia_moi_gio'])}'), Text('Qua đêm: ${money(item['gia_moi_dem'])}'), Text('Theo ngày: ${money(item['gia_moi_ngay'])}'), const SizedBox(height: 16), FilledButton.icon(onPressed: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => DatPhong(api: api, room: item))), icon: const Icon(Icons.calendar_month), label: const Text('Đặt phòng'))], const SizedBox(height: 24), Text(label(item, 'mo_ta', 'Thông tin đang cập nhật'), style: const TextStyle(height: 1.6)), if (item['tien_nghi'] is List) Padding(padding: const EdgeInsets.only(top: 20), child: Wrap(spacing: 8, runSpacing: 8, children: [for (final amenity in item['tien_nghi']) Chip(label: Text('$amenity'))]))]);
      return box.maxWidth > 800 && MediaQuery.textScalerOf(context).scale(14) < 24 ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(flex: 3, child: gallery), const SizedBox(width: 24), Expanded(flex: 2, child: info)]) : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [gallery, const SizedBox(height: 24), info]);
    })));
  }
}
