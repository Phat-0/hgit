import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

typedef Json = Map<String, dynamic>;
List<Json> rows(dynamic value) => value is List ? value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : [];
String label(Json item, String key, [String fallback = '']) => '${item[key] ?? fallback}';

class Api extends ChangeNotifier {
  Api({http.Client? client, String? base}) : client = client ?? http.Client(), base = base ?? const String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000/api');
  final http.Client client;
  final String base;
  static const _storage = FlutterSecureStorage();
  static const _sessionKey = 'homestay_refresh_token';
  String? _token, _refreshToken;
  Future<bool>? _refreshing;
  bool _remember = false;
  Future<void> _storageQueue = Future.value();

  Future<void> _persist(String? refresh) {
    return _storageQueue = _storageQueue.catchError((Object _) {}).then((_) =>
      refresh == null ? _storage.delete(key: _sessionKey)
        : _storage.write(key: _sessionKey, value: refresh));
  }

  Future<void> signIn(Json session, {required bool remember}) async {
    final access = session['access_token'];
    if (access is! String || access.isEmpty) throw const FormatException('Phiên đăng nhập không hợp lệ');
    final refresh = session['refresh_token'];
    _remember = remember;
    _refreshToken = refresh is String ? refresh : null;
    try {
      await _persist(remember ? _refreshToken : null);
    } catch (_) {
      _remember = false;
    }
    if (access.isNotEmpty && refresh is String && _refreshToken != refresh) return;
    guest = null;
    token = access;
  }

  Future<void> restoreSession() async {
    try {
      _refreshToken = await _storage.read(key: _sessionKey);
      if (_refreshToken != null) { _remember = true; await _renew(); }
    } catch (_) {
      // Leave the saved session available after temporary network errors.
    }
  }

  Future<bool> _renew() => _refreshing ??= _refresh().whenComplete(() => _refreshing = null);

  Future<bool> _refresh() async {
    final refresh = _refreshToken;
    if (refresh == null) return false;
    try {
      final session = await request('/lam-moi', auth: true, body: {'refresh_token': refresh});
      if (_refreshToken != refresh) return false;
      await signIn(Map<String, dynamic>.from(session as Map), remember: _remember);
      return token != null;
    } on ApiError catch (error) {
      if (_refreshToken == refresh && (error.status == 400 || error.status == 401)) token = null;
      rethrow;
    }
  }
  String? get token => _token;
  set token(String? value) {
    if (value == null) {
      _refreshToken = null;
      guest = null;
      unawaited(_persist(null).catchError((Object _) {}));
    }
    if (_token == value) return;
    _token = value;
    notifyListeners();
  }
  String? guest;
  Future<dynamic> request(String path, {Json? body, bool auth = false, bool admin = false, String? method, bool retryAuth = true}) async {
    final sentToken = token;
    final uri = Uri.parse('$base/${auth ? 'xac-thuc' : admin ? 'quan-tri' : 'khach'}$path');
    final headers = <String, String>{'Accept': 'application/json', if (body != null) 'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token', if (guest != null) 'X-Guest-Chat': guest!};
    try {
      final outgoing = http.Request(method ?? (body == null ? 'GET' : 'POST'), uri)..headers.addAll(headers);
      if (body != null) outgoing.body = jsonEncode(body);
      final response = await client.send(outgoing).then(http.Response.fromStream).timeout(const Duration(seconds: 25));
      dynamic data;
      try { data = jsonDecode(utf8.decode(response.bodyBytes)); } catch (_) { throw Exception('Máy chủ trả về dữ liệu không hợp lệ'); }
      if (response.statusCode == 401 && (!auth || path == '/ho-so') && sentToken != null) {
        if (retryAuth && token != null && (token != sentToken || await _renew())) {
          return request(path, body: body, auth: auth, admin: admin, method: method, retryAuth: false);
        }
        if (token == sentToken) token = null;
      }
      if (response.statusCode >= 400) {
        final message = data is Map ? data['message'] : null;
        final code = data is Map ? data['code'] : null;
        throw ApiError(
          response.statusCode,
          message is List ? message.join('; ') : '${message ?? 'Không thực hiện được yêu cầu'}',
          code: code is String ? code : null,
        );
      }
      return data;
    } on TimeoutException { throw Exception('Kết nối quá lâu. Vui lòng thử lại'); }
    on http.ClientException { throw Exception('Không kết nối được máy chủ. Kiểm tra mạng và API_URL'); }
  }
  Future<void> uploadChat(String id, List<int> bytes, String filename, String mime, String key, String caption) async {
    final req = http.MultipartRequest('POST', Uri.parse('$base/khach/chat/$id/tep'));
    if (token != null) req.headers['Authorization'] = 'Bearer $token';
    if (guest != null) req.headers['X-Guest-Chat'] = guest!;
    req.fields.addAll({'ma_phia_khach': key, 'noi_dung': caption});
    req.files.add(http.MultipartFile.fromBytes('file', bytes,
      filename: filename, contentType: MediaType.parse(mime)));
    final response = await client.send(req).then(http.Response.fromStream)
      .timeout(const Duration(seconds: 60));
    if (response.statusCode >= 400) {
      final payload = jsonDecode(utf8.decode(response.bodyBytes));
      throw ApiError(response.statusCode, payload is Map
        ? '${payload['message'] ?? 'Không gửi được tệp'}' : 'Không gửi được tệp');
    }
  }

  void close() => client.close();
}

class ApiError implements Exception {
 const ApiError(this.status, this.message, {this.code});
 final int status;
 final String message;
 final String? code;

 bool get phongKhongKhaDung => status == 409 &&
     (code == 'PHONG_KHONG_KHA_DUNG' ||
         (code == null && message.startsWith('Phòng vừa được đặt')));
 @override String toString() => message;
}
