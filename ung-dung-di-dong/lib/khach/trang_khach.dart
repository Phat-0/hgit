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
  const TrangKhach({super.key, required this.api, required this.scale, required this.onScale, this.section = 0, this.adminAction, this.onBookingSaved});
  final Api api;
  final int section;
  final VoidCallback? adminAction, onBookingSaved;
  final double scale;
  final ValueChanged<double> onScale;
  @override
  State<TrangKhach> createState() => _TrangKhachState();
}
class _TrangKhachState extends State<TrangKhach> {
  late Future<List<dynamic>> data;
  String branch = '';
  int tab = 0;
  String sort = 'noi_bat';
  @override
  void initState() { super.initState(); tab = widget.section == 3 ? 1 : 0; reload(); }
  void reload() { data = Future.wait([widget.api.request('/gioi-thieu'), widget.api.request('/trang-chu'), widget.section == 0 ? widget.api.request('/phong-trong-hien-tai').catchError((_) => null) : Future<dynamic>.value(null) ]); }
  void settings() => showModalBottomSheet<void>(context: context, showDragHandle: true, builder: (context) => SafeArea(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Cỡ chữ', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 16), Wrap(spacing: 8, children: [1.0, 1.15, 1.3, 1.5].map((s) => ChoiceChip(label: Text('${(s * 100).round()}%'), selected: widget.scale == s, onSelected: (_) { widget.onScale(s); Navigator.pop(context); })).toList()), const SizedBox(height: 16), const Text('Cỡ chữ của hệ thống vẫn được giữ. App tự điều chỉnh bố cục khi chữ lớn hơn.')]))));
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('HomeStay'), actions: [if(widget.adminAction != null) IconButton(onPressed: widget.adminAction, icon: const Icon(Icons.dashboard_outlined), tooltip: 'Quản trị'), IconButton(onPressed: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => TaiKhoan(api: widget.api))), icon: const Icon(Icons.person_outline), tooltip: 'Tài khoản và đơn của tôi'), IconButton(onPressed: settings, icon: const Icon(Icons.text_fields), tooltip: 'Cỡ chữ')]),
    floatingActionButton: FloatingActionButton(onPressed: () => showModalBottomSheet<void>(context: context, isScrollControlled: true, showDragHandle: true, builder: (_) => SizedBox(height: MediaQuery.sizeOf(context).height * .82, child: TroChuyen(api: widget.api))), tooltip: 'Chat với CSKH', child: const Icon(Icons.chat_bubble_outline)),
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
      final available = rows(snapshot.data![2]);
      final shown = (tab == 0 ? rooms : tab == 1 ? combos : available).where((p) => branch.isEmpty || (tab != 1 ? p['homestay_id'] == branch : p['pham_vi'] == 'toan_he_thong' || (p['chi_nhanh_ids'] is List && (p['chi_nhanh_ids'] as List).contains(branch)) || (p['pham_vi'] == 'phong' && p['phong_ids'] is List && rooms.any((room) => room['homestay_id'] == branch && (p['phong_ids'] as List).contains(room['id']))))).toList();
      shown.sort((a,b) { final key = tab == 1 ? 'gia_combo' : 'gia_moi_gio'; final price = (num.tryParse('${a[key]}') ?? 0).compareTo(num.tryParse('${b[key]}') ?? 0); return sort == 'gia_tang' ? price : sort == 'gia_giam' ? -price : (num.tryParse('${b['luot_dat']}') ?? 0).compareTo(num.tryParse('${a['luot_dat']}') ?? 0); });
      if (widget.section == 2) {
        return _DatPhongTaiCho(api: widget.api, rooms: rooms, onSaved: widget.onBookingSaved);
      }
      return RefreshIndicator(onRefresh: () async { setState(reload); await data; }, child: CustomScrollView(slivers: [
        if (widget.section == 0) SliverToBoxAdapter(child: _Hero(heading: label(hero, 'tieu_de', 'Đổi không gian. Chạm cảm hứng.'), description: label(hero, 'noi_dung'), image: label(hero, 'anh_nen', label(hero, 'anh', rooms.isNotEmpty && photos(rooms.first).isNotEmpty ? photos(rooms.first).first : '')), name: label(ui, 'ten_web', 'HomeStay'))),
        SliverPadding(padding: const EdgeInsets.symmetric(horizontal: 20), sliver: SliverToBoxAdapter(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (widget.section == 0) SingleChildScrollView(scrollDirection: Axis.horizontal, child: Wrap(spacing: 8, children: [ChoiceChip(label: const Text('Phòng & giá'), selected: tab == 0, onSelected: (_) => setState(() => tab = 0)), ChoiceChip(label: const Text('Combo'), selected: tab == 1, onSelected: (_) => setState(() => tab = 1)), ChoiceChip(label: const Text('Phòng trống hiện tại'), selected: tab == 2, onSelected: (_) => setState(() { tab = 2; reload(); }))])),
          const SizedBox(height: 16), Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: DropdownButtonFormField<String>(initialValue: branch, isExpanded: true, decoration: const InputDecoration(labelText: 'Chi nhánh'), items: [const DropdownMenuItem(value: '', child: Text('Tất cả chi nhánh')), ...branches.map((b) => DropdownMenuItem(value: label(b, 'id'), child: Text(label(b, 'ten_homestay', label(b, 'ten')), overflow: TextOverflow.ellipsis)))], onChanged: (v) => setState(() => branch = v ?? ''))),
          const SizedBox(width: 8), Expanded(child: DropdownButtonFormField<String>(initialValue: sort, isExpanded: true, decoration: const InputDecoration(labelText: 'Sắp xếp'), items: const [DropdownMenuItem(value: 'noi_bat', child: Text('Nổi bật')), DropdownMenuItem(value: 'gia_tang', child: Text('Giá tăng dần')), DropdownMenuItem(value: 'gia_giam', child: Text('Giá giảm dần'))], onChanged: (v) => setState(() => sort = v ?? 'noi_bat')))]),
          const SizedBox(height: 16), if (shown.isEmpty) Padding(padding: const EdgeInsets.all(24), child: Text(tab == 2 && snapshot.data![2] == null ? 'Chưa tải được phòng trống. Kéo xuống để thử lại.' : 'Chưa có dữ liệu phù hợp.')),
        ]))),
        SliverPadding(padding: const EdgeInsets.symmetric(horizontal: 20), sliver: SliverLayoutBuilder(builder: (context, constraints) {
          const count = 2;
          return SliverList(delegate: SliverChildBuilderDelegate((context, index) {
            final slice = shown.skip(index * count).take(count).toList();
            return Padding(padding: const EdgeInsets.only(bottom: 16), child: AnimatedSwitcher(duration: const Duration(milliseconds: 420), transitionBuilder: (child, animation) => FadeTransition(opacity: animation, child: SlideTransition(position: Tween(begin: const Offset(.03, 0), end: Offset.zero).animate(animation), child: child)), child: Row(key: ValueKey('$tab-$branch-$sort-$index'), crossAxisAlignment: CrossAxisAlignment.start, children: [for (var n = 0; n < count; n++) Expanded(child: n >= slice.length ? const SizedBox() : Padding(padding: EdgeInsets.only(right: n == count - 1 ? 0 : 16), child: HienDan(delay: Duration(milliseconds: n * 100), child: _Card(item: slice[n], combo: tab == 1, onTap: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => ChiTiet(api: widget.api, item: slice[n], combo: tab == 1)))))))])));
          }, childCount: (shown.length / count).ceil()));
        })),
        if (widget.section == 0) SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.fromLTRB(20, 20, 20, 96), child: HienDan(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Khách hàng nói về homestay', style: Theme.of(context).textTheme.titleLarge), const SizedBox(height: 16), for (final review in rows(catalog['danh_gia']).take(3)) Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${label(review, 'ten_khach')} · ${label(review, 'so_sao')} ★'), const SizedBox(height: 8), Text(label(review, 'noi_dung'))])))])))),
      ]));
    }),
  );
}

class _DatPhongTaiCho extends StatefulWidget {
  const _DatPhongTaiCho({required this.api, required this.rooms, this.onSaved});
  final Api api;
  final List<Json> rooms;
  final VoidCallback? onSaved;
  @override State<_DatPhongTaiCho> createState() => _DatPhongTaiChoState();
}

class _DatPhongTaiChoState extends State<_DatPhongTaiCho> {
  String? roomId;
  int formVersion = 0;

  @override Widget build(BuildContext context) {
    if (widget.rooms.isEmpty) return const Center(child: Text('Chưa có phòng.'));
    final room = widget.rooms.firstWhere(
      (room) => label(room, 'id') == roomId, orElse: () => widget.rooms.first,
    );
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: DropdownButtonFormField<String>(
          initialValue: label(room, 'id'),
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Chọn phòng'),
          items: [
            for (final item in widget.rooms)
              DropdownMenuItem(value: label(item, 'id'),
                child: Text(label(item, 'ten_phong'), overflow: TextOverflow.ellipsis)),
          ],
          onChanged: (value) => setState(() => roomId = value),
        ),
      ),
      Expanded(child: DatPhong(
        key: ValueKey((room['id'], formVersion)),
        api: widget.api, room: room, embedded: true,
        onSaved: () {
          widget.onSaved?.call();
          setState(() => formVersion++);
        },
      )),
    ]);
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.heading, required this.description, required this.image, required this.name});
  final String heading, description, image, name;
  @override
  Widget build(BuildContext context) => Stack(children: [Positioned.fill(child: RepaintBoundary(child: AnimatedBuilder(animation: Scrollable.of(context).position, child: photo(image), builder: (context, child) => Transform.translate(offset: Offset(0, MediaQuery.of(context).disableAnimations ? 0 : (Scrollable.of(context).position.pixels * .08).clamp(0, 24).toDouble()), child: Transform.scale(scale: 1.08, child: child))))), Positioned.fill(child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.black.withValues(alpha: .15), const Color(0xff251a15)])))), Padding(padding: const EdgeInsets.fromLTRB(24, 110, 24, 48), child: HienDan(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 700), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(name.toUpperCase(), style: const TextStyle(letterSpacing: 3, color: Color(0xffe9bd80))), const SizedBox(height: 18), Text(heading, style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontFamily: 'serif', height: 1.2)), const SizedBox(height: 18), Text(description, style: const TextStyle(height: 1.6))]))))]);
}
class _Card extends StatelessWidget {
  const _Card({required this.item, required this.combo, required this.onTap});
  final Json item;
  final bool combo;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(clipBehavior: Clip.antiAlias, margin: EdgeInsets.zero, child: InkWell(onTap: onTap, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [AspectRatio(aspectRatio: 1.5, child: photo(photos(item).firstOrNull)), Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label(item, combo ? 'ten_combo' : 'ten_phong', label(item, 'ma_phong')), style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: 8), Text(combo ? money(item['gia_combo']) : 'Giờ ${money(item['gia_moi_gio'])} · Đêm ${money(item['gia_moi_dem'])}', style: const TextStyle(color: Color(0xffe9bd80))), const SizedBox(height: 8), Text(combo ? 'Xem chi tiết combo' : label(item, 'ten_homestay')), const SizedBox(height: 8), const Wrap(spacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [Text('Xem chi tiết'), Icon(Icons.arrow_forward, size: 18)])]))])));
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
      final gallery = Column(children: [Stack(children: [AspectRatio(aspectRatio: 1.15, child: PageView(children: [for (final image in images) GestureDetector(onTap: () => Navigator.push(context, MaterialPageRoute<void>(fullscreenDialog: true, builder: (_) => Scaffold(appBar: AppBar(title: const Text('Ảnh phòng')), body: PageView(controller: PageController(initialPage: images.indexOf(image)), children: [for (final src in images) InteractiveViewer(minScale: 1, maxScale: 4, child: Center(child: photo(src, fit: BoxFit.contain)))])))), child: ClipRRect(borderRadius: BorderRadius.circular(20), child: photo(image))), if (images.isEmpty) photo(null)])),
        if (!combo && item['dang_su_dung'] is bool)
          Positioned(top: 8, right: 8, child: Chip(
            backgroundColor: item['dang_su_dung'] == true ? const Color(0xff743829) : const Color(0xff235b42),
            label: Text(item['dang_su_dung'] == true ? 'Đang sử dụng' : 'Đang trống', style: const TextStyle(color: Colors.white)),
          )),
      ]), if (images.length > 1) const Padding(padding: EdgeInsets.all(12), child: Text('Vuốt xem ảnh · Chạm để phóng to'))]);
      final info = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label(item, combo ? 'ten_combo' : 'ten_phong'), style: Theme.of(context).textTheme.headlineMedium), const SizedBox(height: 20), if (combo) ...[Text(money(item['gia_combo'])), const SizedBox(height: 16), ComboDat(api: api, combo: item)] else ...[Text('Theo giờ: ${money(item['gia_moi_gio'])}'), Text('Qua đêm: ${money(item['gia_moi_dem'])}'), Text('Theo ngày: ${money(item['gia_moi_ngay'])}'), const SizedBox(height: 16), FilledButton.icon(onPressed: () => Navigator.push(context, MaterialPageRoute<void>(builder: (_) => DatPhong(api: api, room: item))), icon: const Icon(Icons.calendar_month), label: const Text('Đặt phòng'))], const SizedBox(height: 24), Text(label(item, 'mo_ta', 'Thông tin đang cập nhật'), style: const TextStyle(height: 1.6)), if (item['tien_nghi'] is List) Padding(padding: const EdgeInsets.only(top: 20), child: Wrap(spacing: 8, runSpacing: 8, children: [for (final amenity in item['tien_nghi']) Chip(label: Text('$amenity'))]))]);
      return box.maxWidth > 800 && MediaQuery.textScalerOf(context).scale(14) < 24 ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(flex: 3, child: gallery), const SizedBox(width: 24), Expanded(flex: 2, child: info)]) : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [gallery, const SizedBox(height: 24), info]);
    })));
  }
}

class ComboDat extends StatefulWidget {
  const ComboDat({super.key, required this.api, required this.combo});
  final Api api; final Json combo;
  @override State<ComboDat> createState() => _ComboDatState();
}
class _ComboDatState extends State<ComboDat> {
  int quantity = 1;
  bool busy = false;
  Future<void> choose() async {
    setState(() => busy = true);
    try {
      final result = await widget.api.request('/gioi-thieu');
      final rooms = rows(result['phong']).where((p) => widget.combo['pham_vi'] == 'toan_he_thong' || (widget.combo['phong_ids'] is List && (widget.combo['phong_ids'] as List).contains(p['id'])) || (widget.combo['chi_nhanh_ids'] is List && (widget.combo['chi_nhanh_ids'] as List).contains(p['homestay_id']))).toList();
      if(!mounted) return;
      final room = await showDialog<Json>(context: context, builder: (c) => SimpleDialog(title: const Text('Chọn phòng'), children: [if(rooms.isEmpty) const Padding(padding: EdgeInsets.all(20), child: Text('Chưa có phòng phù hợp.')), for(final p in rooms) SimpleDialogOption(onPressed: () => Navigator.pop(c,p), child: Text('${label(p,'ten_phong')} · ${label(p,'ten_homestay')}'))]));
      if(room != null && mounted) await Navigator.push(context, MaterialPageRoute<void>(builder: (_) => DatPhong(api: widget.api, room: room, initialCombo: widget.combo, initialQuantity: quantity)));
    } catch(e) { if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'))); }
    finally { if(mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [TextFormField(initialValue: '1', keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Số lượng'), onChanged: (v) { final n = int.tryParse(v); setState(() => quantity = n ?? 0); }), const SizedBox(height: 12), FilledButton(onPressed: busy || quantity < 1 || quantity > (widget.combo['so_gio_bao_gom'] == null ? 20 : 1) ? null : choose, child: const Text('Chọn phòng và đặt combo'))]);
}
