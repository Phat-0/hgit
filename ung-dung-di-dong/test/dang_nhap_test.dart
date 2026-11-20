import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:homestay_app/main.dart';
void main() {
 testWidgets('Không mở nội dung khách khi chưa đăng nhập', (tester) async {
   SharedPreferences.setMockInitialValues({});
   await tester.pumpWidget(const HomestayApp());
   await tester.pump(const Duration(seconds: 1));
   expect(find.text('Đăng nhập'), findsOneWidget);
   expect(find.text('Phòng trống hiện tại'), findsNothing);
   expect(find.byIcon(Icons.shopping_bag_outlined), findsNothing);
   expect(tester.takeException(), isNull);
   await tester.pumpWidget(const SizedBox());
 });
}
