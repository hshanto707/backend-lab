## Requirement 1
✔️ Create an API that increases the computational times each minute
✔️ If the output available in the cache then provide it from cache without the computation
✔️ Dockerize the App

## Requirement 2
✔️ Create a proper abstraction for caching so that we can plug & play any DB like Redis, Valkey, MongoDB, PostgreSQL etc. Study Design patterns to solve it.
❌ If the primary caching DB (e.g. Redis) fails to connect then the secondary DB should cache it (e.g. MongoDB)

## Requirement 3
❌ When the primary DB comes online again all the cache of the secondary DB should by sync with the primary caching DB
