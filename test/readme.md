docker pull postgres:9.5
docker run -d -p 5432:5432 --name postgres -e POSTGRES_PASSWORD=postgres -d postgres:9.5
docker exec -it postgres bash
docker exec -it postgres psql -U postgres -c "create database testdb;"