# Course Evaluation Demo Walkthrough (1-Page)

Follow this exact step-by-step sequence to demonstrate all database design, transaction handling, and security features during the course presentation.

---

### Step 1: Open the Application
1. Navigate to `http://localhost:5173` in your browser.
2. Note the clean campus layout: Top nav with **Campus Rides**, search bar with **FROM**, **TO**, **WHEN (±30m)**, and **SEATS NEEDED**.
3. Point out the pre-seeded rides with driver ratings, route landmarks, and dynamic seat pills (**2 seats left**, **1 seat left**, **Full**).

---

### Step 2: Driver Posts a New Ride
1. Click **Sign In** on the top right. Click **Arun (Driver)** under 1-Click Demo Accounts.
2. Click the **Driver Hub** tab in the navbar.
3. In the **Post a New Ride** form:
   - Pickup Stop: `Main Gate`
   - Destination Stop: `Katpadi Station`
   - Total Seats: `3 Seats`
   - Price: `₹120`
4. Click **Publish Ride to Pool**. The ride immediately appears under **My Posted Rides** with 3/3 seats free.

---

### Step 3: Concurrency Race & 5-Minute Seat Hold
1. Log out (or open an Incognito window). Click **Sign In** and choose **Sneha (Rider)**.
2. On the **Find a ride** tab, locate Arun's ride from Main Gate to Katpadi Station.
3. Click **Book**. Notice the modal opens:
   - Select `1 Seat` and click **Hold 1 Seat(s) for 5 Min**.
   - Watch the **live 5-minute countdown timer** start ticking.
   - Explain to the professor: *The database function `book_seat()` locked the row with `SELECT ... FOR UPDATE`, decremented `seats_available`, and set `hold_expires_at`.*
4. Click **Confirm & Pay ₹120.00**.
   - The mock payment gateway charges the campus wallet and inserts a **CHARGE** entry into the append-only ledger `payments`.
   - The booking transitions to **CONFIRMED**.

---

### Step 4: Concurrency Stress Test (3 out of 50 Success Guarantee)
1. In your terminal, run:
   ```bash
   npm run test:concurrency
   ```
2. Show the terminal output to the professor:
   - 50 simultaneous HTTP booking requests are fired at once against a 3-seat ride.
   - **EXACTLY 3 bookings succeed** (HTTP 201).
   - **EXACTLY 47 bookings fail** with HTTP 409 (*"Someone just took the last seat"*).
   - Database verification confirms `seats_available = 0` and exactly 3 records exist.
   - Idempotency replay verification confirms submitting the same key twice causes zero duplicate charges or seat decrements.

---

### Step 5: Rider Cancellation & Automatic Tiered Refund
1. In the browser (as Sneha), go to the **My bookings** tab.
2. Locate the confirmed booking and click **Cancel Booking**.
3. Notice that the modal calculates and displays the exact refund percentage and amount **BEFORE** confirmation:
   - *Because departure is > 24 hours away, 100% refund (₹120.00) is shown.*
4. Click **Confirm Cancellation**.
5. The booking updates to **Cancelled by You**, an append-only **REFUND** row is written to `payments`, and the seat is returned to the ride.

---

### Step 6: Driver Completes Ride & Rider Submits Rating
1. Log in as **Arun (Driver)**. Go to **Driver Hub**.
2. Click **Complete Ride** on an active ride.
   - Ride status updates to `COMPLETED` and all confirmed passenger bookings update to `COMPLETED`.
3. Switch back to **Sneha (Rider)** under **My bookings**.
4. The **Rate Driver** button is now unlocked! Click it and give Arun **5 Stars** with a comment: *"Smooth driving and on time!"*.
5. Submit the rating:
   - Explain: *Database trigger `trg_driver_rating_sync` immediately recalculated Arun's `rating_avg` and `rating_count` on the `users` table.*

---

### Step 7: Administrator Audit Trail & Financial Ledger
1. Click **Sign In** and choose **Admin**.
2. Click the **Admin** tab in the navbar.
3. Show the live administrative tabs:
   - **Audit Log**: Point out the trigger-generated JSONB state transitions showing `PENDING -> CONFIRMED -> COMPLETED`.
   - **Payment Ledger**: Point out the append-only record of every `CHARGE` and `REFUND`.
   - **Users & Rides**: Live tables showing all system data.
