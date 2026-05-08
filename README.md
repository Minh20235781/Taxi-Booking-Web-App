# Hướng dẫn làm việc nhóm - Taxi-Booking-Web-App

## Quy trình làm việc (Git Flow)

### 1. Clone Repository (Lần đầu tiên)

```bash
git clone https://github.com/Minh20235781/Taxi-Booking-Web-App.git
cd Taxi-Booking-Web-App
```

### 2. Cài đặt Dependencies

```bash
cd frontend
npm install
```

### 3. Tạo Branch cho Feature mới

**LƯU Ý**: LUÔN tạo branch từ `develop`, KHÔNG phải từ `main`

```bash
# Checkout develop
git checkout develop

# Pull code mới nhất
git pull origin develop

# Tạo branch mới theo format: feature/ten-chuc-nang-ten-thanh-vien
git checkout -b feature/login-member_name1
```

### 4. Làm việc hàng ngày

```bash
# 1. Trước khi bắt đầu code, pull code mới nhất
git pull origin develop

# 2. Sau đó lên github mở pull request


# 3. Giải quyết conflict (nếu có)

# 4. Code...

# 5. Commit thường xuyên
git add .
git commit -m "feat: add login form validation"

# 6. Push lên remote
git push origin feature/login-member1
```

### 5. Tạo Pull Request

1. Vào GitHub repository: https://github.com/Minh20235781/Taxi-Booking-Web-App.git
2. Click **Pull requests** → **New pull request**
3. Base: `develop` ← Compare: `feature/login-member1`
4. Điền tiêu đề và mô tả chi tiết những gì đã làm
5. Assign reviewer (T set up cần ít nhất 1 người thông qua )
6. Click **Create pull request**

### 6. Code Review (Dành cho Reviewer)

- Kiểm tra code logic
- Test chức năng trên máy local
- Comment nếu cần sửa
- Approve và Merge nếu OK

## Quy tắc đặt tên Branch

| Loại            | Format                                 | Ví dụ                        |
| --------------- | -------------------------------------- | ---------------------------- |
| Feature mới     | `feature/ten-chuc-nang-ten-thanh-vien` | `feature/login-member1`      |
| Sửa bug         | `bugfix/ten-bug-ten-thanh-vien`        | `bugfix/login-error-member2` |
| Hotfix khẩn cấp | `hotfix/mo-ta`                         | `hotfix/security-patch`      |

## Quy tắc Commit Message

```bash
# Feature mới
git commit -m "feat: add user authentication"

# Sửa bug
git commit -m "fix: resolve login button not working"

# Cập nhật UI
git commit -m "style: update login page design"

# Refactor code
git commit -m "refactor: optimize product list component"

# Cập nhật docs
git commit -m "docs: update README installation guide"

# Chore (cập nhật dependencies, config)
git commit -m "chore: update react version to 18.2.0"
```

## Phân công nhiệm vụ

| Thành viên | Module                                   | Branch                      |
| ---------- | ---------------------------------------- | --------------------------- |
| Member 1   | Authentication (Login, Register, Logout) | `feature/auth-member1`      |
| Member 2   | Dashboard & Layout                       | `feature/dashboard-member2` |
| Member 3   | Products Management                      | `feature/products-member3`  |
| Member 4   | Orders Management                        | `feature/orders-member4`    |
| Member 5   | User Profile & Settings                  | `feature/profile-member5`   |

## Giải quyết Conflict

```bash
# 1. Pull code mới nhất từ develop
git checkout develop
git pull origin develop

# 2. Merge develop vào branch của bạn
git checkout feature/login-member1
git merge develop

# 3. Nếu có conflict, Git sẽ báo
# Mở file bị conflict, tìm dòng:
# <<<<<<< HEAD
# (code của bạn)
# =======
# (code từ develop)
# >>>>>>> develop

# 4. Chỉnh sửa giữ lại code đúng, xóa các dấu conflict

# 5. Commit sau khi giải quyết conflict
git add .
git commit -m "merge: resolve conflict with develop"
git push origin feature/login-member1
```

## Lệnh Git quan trọng

```bash
# Xem trạng thái hiện tại
git status

# Xem lịch sử commit
git log --oneline --graph

# Xem thay đổi chưa commit
git diff

# Hủy thay đổi một file chưa commit
git checkout -- <filename>

# Quay lại commit trước đó (cẩn thận!)
git reset --hard HEAD~1

# Xem tất cả branch
git branch -a

# Xóa branch local
git branch -d feature/old-feature

# Đổi tên branch hiện tại
git branch -m new-branch-name
```

## Lưu ý quan trọng

❌ **KHÔNG BAO GIỜ**:

- Push trực tiếp lên `main` hoặc `develop`
- Force push (`git push -f`) trừ khi được cho phép
- Commit file `node_modules/`, `.env`
- Commit code chưa test

✅ **LUÔN LUÔN**:

- Pull code mới nhất trước khi bắt đầu làm việc
- Commit thường xuyên với message rõ ràng
- Tạo Pull Request để review code
- Test kỹ trước khi tạo PR
- Giải quyết conflict ngay khi phát hiện

## Meeting Schedule

- **Daily Standup**: Mỗi ngày 9:00 AM (15 phút)
  - Hôm qua làm gì?
  - Hôm nay sẽ làm gì?
  - Có vấn đề gì cần hỗ trợ?

- **Weekly Review**: Thứ 7 hàng tuần 10:00 PM
  - Demo chức năng đã hoàn thành
  - Review code chung
  - Plan tuần tiếp theo

## Workflow Diagram

```
main (Production)
  ↑
  | (Pull Request + Review)
  |
develop (Development)
  ↑
  | (Pull Request + Review)
  |
feature/xxx-member1 (Your work)
```
