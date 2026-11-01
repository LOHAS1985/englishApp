# ビルドステージ
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B
COPY src ./src
COPY tts ./tts
RUN ./mvnw clean package -DskipTests

# 実行ステージ
FROM eclipse-temurin:25-jre-jammy
WORKDIR /app
RUN apt-get update \
	&& DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 python3-pip ffmpeg \
	&& ln -sf /usr/bin/python3 /usr/bin/python || true \
	&& pip3 install --no-cache-dir edge-tts \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=build /app/tts ./tts
COPY --from=build /app/target/*.jar app.jar

# Render 無料プラン(CPU 0.1)では起動に数分かかるため、起動を速くする:
# 1. jar を展開して起動する(fat jar の中の jar を読む処理を省き、AOT キャッシュも効くようにする)
# 2. Java 25 の AOT キャッシュ:ビルド時に1度起動し(spring.context.exit=onRefresh で起動直後に終了)、
#    読み込んだクラスの解析結果を保存しておき、本番の起動で使う。外部 DB は使わずインメモリ H2 で学習させる。
#    本番は遅延初期化だが、学習時はすべての Bean を作って最初の API 呼び出しで使うクラスもキャッシュに入れる
#    (実行時に使う PostgreSQL ドライバのクラスはキャッシュに入らないだけで、動作には影響しない)
# ヒープの上限(-Xmx)はキャッシュ作成時と実行時で揃える。Render 無料プランはメモリ 512MB。
# AOTClassLinking は切る(有効だとヒープを保存した領域を読めない環境で JVM が起動せずに終了する。切ってもクラスの読み込み・解析を省く効果は残り、
# キャッシュが使えない場合は警告を出して通常どおり起動する)
RUN java -Djarmode=tools -jar app.jar extract --destination application \
	&& rm app.jar \
	&& cd application \
	&& SPRING_PROFILES_ACTIVE=prod GEMINI_API_KEY=dummy \
		java -XX:AOTCacheOutput=app.aot -XX:-AOTClassLinking -Xmx256m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 \
		-Dspring.context.exit=onRefresh -Dspring.main.lazy-initialization=false -jar app.jar

EXPOSE 8080
WORKDIR /app/application
# 記録の日時(LocalDateTime)を日本時間で保存する。
# CPU が少ない環境では、並列 GC と最適化コンパイラ(C2)の負担が起動を遅らせるので、SerialGC と C1 だけにする
ENTRYPOINT ["java", "-Duser.timezone=Asia/Tokyo", "-XX:AOTCache=app.aot", "-Xmx256m", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-jar", "app.jar"]
