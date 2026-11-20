import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:homestay_app/main.dart';
void main() {
 testWidgets('Không mở nội dung khách khi chưa đăng nhập', (tester) async {
   SharedPreferences.setMockInitialValues({});
   FlutterSecureStorage.setMockInitialValues({});
   await tester.pumpWidget(const HomestayApp());
   await tester.pump(const Duration(seconds: 1));
   await tester.pump();
   expect(find.text('Đăng nhập'), findsOneWidget);
   expect(find.text('Phòng trống hiện tại'), findsNothing);
   expect(find.byIcon(Icons.shopping_bag_outlined), findsNothing);
   expect(tester.takeException(), isNull);
   await tester.tap(find.text('Tạo tài khoản'));
   await tester.pump();
   expect(find.text('Quay lại đăng nhập'), findsOneWidget);
   expect(find.text('Email'), findsWidgets);
   await tester.pumpWidget(const SizedBox());
 });
}
