import 'dart:async';
import 'package:flutter/material.dart';

class HienDan extends StatefulWidget {
  const HienDan({super.key, required this.child, this.delay = Duration.zero});
  final Widget child;
  final Duration delay;
  @override
  State<HienDan> createState() => _HienDanState();
}
class _HienDanState extends State<HienDan> with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 270));
  late final Animation<double> curve = CurvedAnimation(parent: controller, curve: Curves.easeOutCubic);
  bool scheduled = false;
  Timer? entrance;
  ScrollPosition? position;
  void check() {
    if (!mounted || controller.value > 0) return;
    if (MediaQuery.of(context).disableAnimations) { controller.value = 1; return; }
    final box = context.findRenderObject();
    if (box is RenderBox && box.hasSize) {
      final y = box.localToGlobal(Offset.zero).dy;
      if (y < MediaQuery.sizeOf(context).height - 20 && y + box.size.height > 0) {
        if (widget.delay == Duration.zero) {
          controller.forward();
        } else {
          entrance ??= Timer(widget.delay, () { if (mounted) controller.forward(); });
        }
      }
    }
  }
  void schedule() {
    if (scheduled) return;
    scheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) { scheduled = false; check(); });
  }
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    position?.removeListener(schedule);
    position = Scrollable.maybeOf(context)?.position;
    position?.addListener(schedule);
    schedule();
  }
  @override
  void dispose() { entrance?.cancel(); position?.removeListener(schedule); controller.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    schedule();
    return FadeTransition(opacity: curve, child: SlideTransition(position: Tween(begin: const Offset(-.025, -.025), end: Offset.zero).animate(curve), child: widget.child));
  }
}
