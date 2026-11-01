package com.example.backend.device;

import com.example.backend.device.DeviceService.DeviceLimitException;
import com.example.backend.device.DeviceService.DeviceView;
import com.example.backend.device.DeviceService.Registration;
import com.example.backend.device.DeviceService.WrongKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** 端末の登録(初回だけ合言葉が必要)と、登録済み端末の一覧・削除(マイページ) */
@RestController
@RequestMapping("/api/devices")
public class DeviceController {

  public record RegisterRequest(String key, String name) {
  }

  private final DeviceService deviceService;

  public DeviceController(DeviceService deviceService) {
    this.deviceService = deviceService;
  }

  @PostMapping("/register")
  public Registration register(@RequestBody RegisterRequest request) {
    return deviceService.register(request.key(), request.name());
  }

  @GetMapping
  public List<DeviceView> list(
      @RequestAttribute(name = DeviceFilter.DEVICE_ID_ATTRIBUTE, required = false) Long currentDeviceId) {
    return deviceService.list(currentDeviceId);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    deviceService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @ExceptionHandler(WrongKeyException.class)
  public ResponseEntity<Map<String, String>> wrongKey(WrongKeyException e) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
  }

  @ExceptionHandler(DeviceLimitException.class)
  public ResponseEntity<Map<String, String>> limit(DeviceLimitException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
  }
}
