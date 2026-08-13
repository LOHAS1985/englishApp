# ビルドステージ
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B
COPY src ./src
COPY tts ./tts
RUN ./mvnw clean package -DskipTests

# 実行ステージ
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
COPY --from=build /app/tts ./tts
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg && ln -s /usr/bin/python3 /usr/bin/python && pip3 install --no-cache-dir edge-tts
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]