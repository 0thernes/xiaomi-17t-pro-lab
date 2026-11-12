;; Xiaomi 17T Pro Lab — hand-written WASM kernels.
;; Rebuild: /tmp/vendor-src/node_modules/wabt/bin/wat2wasm --enable-simd src/sim/kernels.wat -o src/sim/kernels.wasm
;; These kernels run in the browser's WASM engine. They are not SME2 and not the NPU 990.
(module
  (memory (export "memory") 32)
  (func (export "simd_f32x4_adds") (param $n i32) (result f32)
    (local $i i32)
    (local $v v128)
    (local.set $v (f32x4.splat (f32.const 1.0001)))
    (loop $L
      (local.set $v (f32x4.add (local.get $v) (f32x4.splat (f32.const 0.0001))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $L (i32.lt_u (local.get $i) (local.get $n)))
    )
    (f32x4.extract_lane 0 (local.get $v))
  )
  (func (export "scalar_f32_adds") (param $n i32) (result f32)
    (local $i i32)
    (local $a f32)
    (local $b f32)
    (local $c f32)
    (local $d f32)
    (local.set $a (f32.const 1.0001))
    (local.set $b (f32.const 1.0002))
    (local.set $c (f32.const 1.0003))
    (local.set $d (f32.const 1.0004))
    (loop $L
      (local.set $a (f32.add (local.get $a) (f32.const 0.0001)))
      (local.set $b (f32.add (local.get $b) (f32.const 0.0001)))
      (local.set $c (f32.add (local.get $c) (f32.const 0.0001)))
      (local.set $d (f32.add (local.get $d) (f32.const 0.0001)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $L (i32.lt_u (local.get $i) (local.get $n)))
    )
    (f32.add
      (f32.add (local.get $a) (local.get $b))
      (f32.add (local.get $c) (local.get $d))
    )
  )
  ;; Signed int8 dot product. Bytes live in linear memory.
  (func (export "int8_dot") (param $offA i32) (param $offB i32) (param $n i32) (result i32)
    (local $i i32)
    (local $acc i32)
    (loop $L
      (if (i32.lt_u (local.get $i) (local.get $n))
        (then
          (local.set $acc
            (i32.add
              (local.get $acc)
              (i32.mul
                (i32.load8_s (i32.add (local.get $offA) (local.get $i)))
                (i32.load8_s (i32.add (local.get $offB) (local.get $i)))
              )
            )
          )
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $L)
        )
      )
    )
    (local.get $acc)
  )
)
