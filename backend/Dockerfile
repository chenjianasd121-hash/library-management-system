FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S library && adduser -S -G library library \
    && mkdir -p /app/data/covers && chown -R library:library /app
COPY --from=build /build/target/management-1.0.0.jar /app/app.jar
USER library
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

