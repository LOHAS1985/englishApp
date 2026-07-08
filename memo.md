git init - ローカルフォルダをGitリポジトリにするコマンド
　→ .gitフォルダの作成 - コミット履歴、ブランチ情報等Git管理用の情報が保存される

gir remote add origin

**ORM（Object-Relational Mapping）**
Javaのクラス → DBのテーブルを対応付ける

**JPA（Java Persistence API）**
Javaオブジェクトを永続化するための標準API
※ORMし、SQLを書かずにDB操作ができるようにする仕組み

**_使用ライブラリ_**
Spring Data JPA - リポジトリ(Repository)の実装を自動生成  
 → 開発者が使いやすいAPIを提供（userRepository.save(user), userRepository.findById(id)等）

Hibernate - JPAを実装したライブラリ  
 → JPAの使用を実装したライブラリ（userRepository.save(user)呼び出し時にSQLに変換して実行を行う）
