import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:homestay_app/dung_chung/api.dart';
import 'package:homestay_app/khach/khung_ung_dung.dart';

void main() {
  for (final width in [320.0, 390.0, 768.0, 1024.0]) {
    for (final scale in [1.0, 1.5, 2.0]) {
      testWidgets('Không tràn ở màn $width với cỡ chữ $scale', (tester) async {
        tester.view.physicalSize = Size(width, 1000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final api = Api(client: MockClient((r) async => http.Response(jsonEncode(r.url.path.endsWith('trang-chu') ? {'hero': {'tieu_de': 'Một kỳ nghỉ trọn vẹn', 'noi_dung': 'Không gian riêng dành cho bạn.'}} : {'phong': [{'id': 'p1', 'ten_phong': 'Phòng ban công rộng', 'anh': []}], 'combo': [], 'chi_nhanh': []}), 200)));
        await tester.pumpWidget(MaterialApp(builder: (context, child) => MediaQuery(data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)), child: child!), home: KhungUngDung(api: api, scale: 1, onScale: (_) {})));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.drag(find.byType(CustomScrollView), const Offset(0, -700));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.tap(find.text('Phòng').last);
        await tester.pumpAndSettle();
        expect(find.text('Sắp xếp'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        api.close();
      });
    }
  }
}
