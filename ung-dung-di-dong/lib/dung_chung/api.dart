import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

typedef Json = Map<String, dynamic>;
List<Json> rows(dynamic value) => value is List ? value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() : [];
String label(Json item, String key, [String fallback = '']) => '${item[key] ?? fallback}';

class Api {
  Api({http.Client? client, String? base}) : client = client ?? http.Client(), base = base ?? const String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000/api');
  final http.Client client;
  final String base;
  String? token;
  String? guest;
  Future<dynamic> request(String path, {Json? body, bool auth = false}) async {
    final uri = Uri.parse('$base/${auth ? 'xac-thuc' : 'khach'}$path');
    final headers = <String, String>{'Accept': 'application/json', if (body != null) 'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token', if (guest != null) 'X-Guest-Chat': guest!};
    try {
      final response = await (body == null ? client.get(uri, headers: headers) : client.post(uri, headers: headers, body: jsonEncode(body))).timeout(const Duration(seconds: 25));
      dynamic data;
      try { data = jsonDecode(response.body); } catch (_) { throw Exception('Máy chủ trả về dữ liệu không hợp lệ'); }
      if (response.statusCode >= 400) {
        final message = data is Map ? data['message'] : null;
        throw Exception(message is List ? message.join('; ') : message ?? 'Không thực hiện được yêu cầu');
      }
      return data;
    } on TimeoutException { throw Exception('Kết nối quá lâu. Vui lòng thử lại'); }
    on http.ClientException { throw Exception('Không kết nối được máy chủ. Kiểm tra mạng và API_URL'); }
  }
  void close() => client.close();
}
