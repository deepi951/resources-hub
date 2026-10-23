# ResourceHub Workflow and Module Guide

## Project Overview

ResourceHub is a campus marketplace for PSG College of Technology students. Students publish listings, request purchases, coordinate payment and handover, manage returns, and report problems. Administrators use a separate operations area to review marketplace activity.

The frontend is a React single-page application using Vite and React Router's `HashRouter`. Firebase Authentication identifies users; Cloud Firestore stores marketplace data and enforces access through `firestore.rules`. Product images are uploaded to Cloudinary using an unsigned upload preset.

## Student Workflows

### Account and Access

1. A student registers with a PSG Tech email and the required profile details.
2. The student verifies their email before protected buying and selling routes are available.
3. Login restores the Firebase session and loads the user's Firestore profile.
4. Protected routes redirect unauthenticated, unverified, blocked, or wrong-role users to the appropriate access page.
5. Students can update profile contact and location details from their profile or dashboard.

### Browse, Search, and Listing

1. Students browse the catalog, filter products, and open product details.
2. A seller completes the listing form with title, description, category, price, condition, location, quantity, and payment method.
3. Optional product images are validated and uploaded to Cloudinary. Only secure image URLs are stored in the product record.
4. A seller can view, edit, and delete their own listings from the dashboard.
5. Product stock and sold-out status are displayed to buyers and checked again when a purchase request is created.

### Purchase Request and Stock Reservation

1. A buyer selects a product and sends a purchase request. Checkout currently requests one unit per order.
2. `createPurchaseRequest` uses a Firestore transaction to validate ownership, current price, available quantity, and any existing active request by the same buyer for that product.
3. The transaction creates a pending request, a purchase guard, and a seller notification.
4. The seller accepts or rejects the request from the dashboard.
5. Acceptance rechecks current stock inside a transaction, decrements availability, assigns a persistent display order number, creates the order, links the purchase guard, and notifies the buyer.
6. If the accepted request exhausts stock, other pending requests for that product are rejected in the same transaction, their guards are released, and those buyers receive a sold-out notification. Competing accepts cannot oversell the product.

### Payment and Handover

1. A UPI order becomes `awaiting_payment` after seller acceptance. The seller's UPI ID is copied from the listing, with the configured merchant UPI ID as a fallback.
2. The payment page creates or loads a pending payment record and provides a `upi://pay` link. Opening a UPI app does not verify or record a bank transfer.
3. After paying outside ResourceHub, the buyer selects **I Have Paid**. The order becomes `awaiting_seller_confirmation`; the seller is notified.
4. The seller confirms receipt of the payment. The order advances to `handover_pending` and the payment is marked paid in the application's record.
5. For COD, the order is confirmed without UPI payment. The seller records COD at handover.
6. The seller confirms that handover is complete. The order becomes `completed`, its completion time is saved, and the buyer can leave a review or request a return.

UPI is a manual, user-confirmed workflow, not a payment gateway integration. The app does not independently verify a transfer.

### Returns and Order History

1. A buyer can request a return for a completed order during the seven days following its completion time. The deadline is checked in the UI/service and enforced by Firestore rules.
2. The buyer submits a reason and description. A return record is created at `returns/{orderId}` and the seller receives a notification.
3. The seller can arrange pickup, ask the buyer to contact them, or decline the request. Contact and pickup actions are stored with timestamps and notify the buyer.
4. The buyer can follow the return state in Order Tracking. Seller name, phone, seller message, reason, and description are shown when available; the phone link can initiate a call.
5. New orders snapshot the seller's profile phone when accepted. For older orders without a saved phone number, the seller must choose **Ask buyer to contact me** to share current contact details.
6. After receiving the item, the seller confirms receipt. The return becomes `RETURNED`, the order becomes `returned`, stock is restored if the product record still exists, and the buyer is notified.
7. Completed orders leave active tracking after the return window unless a return remains active. They appear in Order History for both buyers and sellers.

Order History is a dashboard grouping, not a physical move or deletion: order and return documents remain in Firestore for admin review and audit.

### Notifications, Reviews, and Reports

- Student navigation includes a **Notifications** link that opens the dashboard notification section. Students can mark individual notifications read.
- Buyers can review completed transactions that do not already have a review.
- Students can report a product or transaction. Reports are stored for admin review; admins can change report status and the reporter receives a notification.

## Administrator Workflow

There is no public admin registration. An administrator account is created in Firebase Authentication and assigned an `admin` role in its matching `users/{uid}` Firestore profile. Admin routes require an authenticated admin profile.

The admin navigation provides:

| Area | Functionality |
| --- | --- |
| Dashboard | Marketplace activity and summary metrics |
| Students | Search student records and manage account status |
| Products | Search, inspect, and manage marketplace listings |
| Orders | Inspect buyer/seller orders and payment/order states |
| Returns | Review return records, statuses, participants, contact details, deadlines, and seller action timestamps; approve or reject pending requests |
| Sales | Sales totals and trend reporting |
| Complaints | Review submitted reports and update moderation status |
| Settings | View marketplace configuration/status information |
| Profile | View and manage the administrator profile |

Admin routes are nested under `/#/admin`. Admin authorization is also checked in Firestore rules; hiding a route in the UI is not the security boundary.

## Application Routes

The route definitions live in `src/App.jsx`. Student-facing routes include:

| Route | Page |
| --- | --- |
| `/` | Home and featured listings |
| `/products` | Product browse and filters |
| `/product/:productId` | Product details and buy/report actions |
| `/product/:productId/edit` | Edit a seller's own listing |
| `/login` | Student/admin login selection |
| `/login/student` | Student login |
| `/register`, `/signup` | Student registration |
| `/verify-email` | Email verification |
| `/sell` | Create a listing |
| `/checkout/:productId?` | Submit a purchase request |
| `/payment/:orderId` | UPI details and buyer payment claim |
| `/dashboard` | Listings, requests, orders, returns, notifications, reports, and history |
| `/profile` | Student profile |
| `/report/:productId?` | Submit a product or transaction report |
| `/about`, `/contact`, `/support`, `/safety` | Information and support pages |

Admin login is available at `/admin/login`. Protected admin routes are `/admin/dashboard`, `/admin/users`, `/admin/products`, `/admin/orders`, `/admin/returns`, `/admin/sales`, `/admin/reports`, `/admin/settings`, and `/admin/profile`.

## Module Map

| Module | Responsibility |
| --- | --- |
| `src/App.jsx` | Hash-based routes, shared shell, protected student and admin route composition |
| `src/context/AuthContext.jsx` | Firebase auth session, current user, Firestore profile loading and refresh |
| `src/components/` | Student navigation, footer, and protected-route checks |
| `src/pages/` | Student screens for marketplace, accounts, checkout, payment, dashboard, reports, and support |
| `src/services/authService.js` | Student registration, login, logout, profile, and user queries |
| `src/services/productService.js` | Product CRUD and seller/product queries |
| `src/services/imageHostingService.js` | Product image validation and Cloudinary upload |
| `src/services/productPublishingService.js` | Coordinates image uploads with product publishing |
| `src/services/orderService.js` | Purchase requests, stock-safe acceptance, orders, guards, order numbers, and notifications |
| `src/services/paymentService.js` | UPI payment record initialization, buyer claims, seller confirmation, and payment reads |
| `src/services/marketplaceWorkflowService.js` | Handover, returns, reviews, reports, and related notifications |
| `src/services/orderNumberService.js` | Persistent `RH-YYYY-N` display order numbers and legacy order backfill |
| `src/utils/` | Product image compatibility, display labels, and seven-day return calculations |
| `src/data/resourcehubCatalog.js` | Marketplace categories and subcategories |
| `src/admin/pages/` | Administrator dashboard, user, product, order, sales, return, report, settings, and profile screens |
| `src/admin/components/` | Admin layout, data tables, status badges, loading, empty, and stat components |
| `src/admin/services/` | Admin authentication and data access/reporting helpers |
| `firestore.rules` | Role checks, ownership checks, valid transaction state transitions, and collection permissions |

## Firestore Data Model

| Collection | Purpose |
| --- | --- |
| `users` | Student/admin profile, role, status, and contact details |
| `products` | Listings, owner, price, image URLs, payment options, and available stock |
| `purchaseRequests` | Buyer requests awaiting seller acceptance or rejection |
| `purchaseGuards` | Prevent duplicate active buyer requests and connect requests to orders |
| `orders` | Order participants, product/quantity/amount, payment/order states, timestamps, and display number |
| `systemCounters` | Transaction-safe yearly order number allocation |
| `payments` | Application payment state for UPI/COD workflows; not proof of external bank settlement |
| `returns` | Return reason, participants/contact, deadline, seller decisions/actions, and completion timestamps |
| `notifications` | Recipient-scoped marketplace and workflow updates with read state |
| `reviews` | Buyer review tied to a completed order and product |
| `reports` | Product/transaction complaints and admin moderation state |

Firestore transactions coordinate changes that must succeed together, such as stock reservation, order creation, payment claims, seller confirmation, return completion, and associated notifications.

## Setup and Verification

1. Install dependencies with `npm install`.
2. Configure the Firebase web app values: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`.
3. Configure Cloudinary with `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`. The preset must allow unsigned image uploads. `VITE_MERCHANT_UPI_ID` is optional.
4. Enable Email/Password authentication and deploy Firestore rules with `firebase deploy --only firestore:rules`.
5. Run `npm run dev` to start the app. Run `npm run build` for a production build and `npm run lint` for lint checks.

Do not commit `.env` files, put Cloudinary secrets in browser code, or treat client-side role checks as authorization. Keep Firestore rules deployed to the same Firebase project ID used by the Vite environment.