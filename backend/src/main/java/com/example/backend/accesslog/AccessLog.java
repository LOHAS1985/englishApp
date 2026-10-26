package com.example.backend.accesslog;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** API へのアクセス1回分。IP から推定した地域(GeoIpService)も保存する */
@Entity
@Table(name = "access_logs")
public class AccessLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "created_at", nullable = false)
  private LocalDateTime createdAt = LocalDateTime.now();

  @Column(nullable = false, length = 64)
  private String ip;

  @Column(nullable = false, length = 10)
  private String method;

  @Column(nullable = false, length = 255)
  private String path;

  @Column(name = "user_agent", length = 500)
  private String userAgent;

  @Column(length = 100)
  private String country;

  @Column(length = 100)
  private String region;

  @Column(length = 100)
  private String city;

  @Column(length = 200)
  private String isp;

  public AccessLog() {
  }

  public AccessLog(LocalDateTime createdAt, String ip, String method, String path, String userAgent,
      GeoIpService.Geo geo) {
    this.createdAt = createdAt;
    this.ip = ip;
    this.method = method;
    this.path = path;
    this.userAgent = userAgent;
    this.country = geo.country();
    this.region = geo.region();
    this.city = geo.city();
    this.isp = geo.isp();
  }

  public Long getId() { return id; }
  public LocalDateTime getCreatedAt() { return createdAt; }
  public String getIp() { return ip; }
  public String getMethod() { return method; }
  public String getPath() { return path; }
  public String getUserAgent() { return userAgent; }
  public String getCountry() { return country; }
  public String getRegion() { return region; }
  public String getCity() { return city; }
  public String getIsp() { return isp; }
}
