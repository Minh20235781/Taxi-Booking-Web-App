# Taxi Booking ERD

```mermaid
erDiagram
    User ||--o| DriverProfile : "has"
    User ||--o{ Booking : "creates"
    User ||--o{ Ride : "as rider"
    User ||--o{ Rating : "writes"
    VehicleClass ||--o{ Booking : "selected in"
    Booking ||--o| Ride : "becomes"
    DriverProfile ||--o{ Ride : "drives"
    Ride ||--o| Payment : "has"
    Ride ||--o| Rating : "gets"

    User {
      int id PK
      string fullName
      string email UK
      string phone
      string passwordHash
      enum role
    }
    DriverProfile {
      int id PK
      int userId FK UK
      string licenseNumber
      string vehiclePlate
      string vehicleModel
      boolean isOnline
    }
    VehicleClass {
      int id PK
      string code UK
      string name
      float baseFare
      float pricePerKm
      int maxCapacity
    }
    Booking {
      int id PK
      int userId FK
      int vehicleClassId FK
      string pickupAddress
      string destination
      enum status
    }
    Ride {
      int id PK
      int bookingId FK UK
      int riderId FK
      int driverProfileId FK
      enum status
    }
    Payment {
      int id PK
      int rideId FK UK
      float amount
      string method
      string status
    }
    Rating {
      int id PK
      int rideId FK UK
      int userId FK
      int score
      string comment
    }
```
