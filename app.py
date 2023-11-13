from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.secret_key = 'secretpass'  # Add a secret key
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    notes = db.relationship('Note', backref='user', lazy=True)

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    date = db.Column(db.String(20), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# Use a flag to track whether tables are created
tables_created = False

@app.before_request
def create_tables():
    global tables_created
    if not tables_created:
        db.create_all()
        tables_created = True

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/gettingstarted', methods=['GET', 'POST'])
def gettingstarted():
    if request.method == 'POST':
        if 'signup' in request.form:
            email = request.form['email']
            password = request.form['password']
            confirm_password = request.form['confirm_password']

            print(f"Received signup request: email={email}, password={password}, confirm_password={confirm_password}")

            if password == confirm_password:
                # Hash the password before storing
                hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
                print(f"Hashed password: {hashed_password}")

                new_user = User(email=email, password_hash=hashed_password)
                db.session.add(new_user)
                db.session.commit()
                flash('Signup successful!', 'success')
                return redirect(url_for('user'))

        elif 'login' in request.form:
            email = request.form['email']
            password = request.form['password']

            print(f"Received login request: email={email}, password={password}")

            user = User.query.filter_by(email=email).first()

            if user and check_password_hash(user.password_hash, password):
                # Set user information in the session
                session['user_id'] = user.id
                flash('Login successful!', 'success')
                return redirect(url_for('user'))  # Redirect to homepage.html
            else:
                flash('Invalid email or password.', 'error')

    return render_template("getting_started.html")

@app.route('/user')
def user():
    # Check if user information is in the session
    if 'user_id' in session:
        user_id = session['user_id']
        user = User.query.get(user_id)
        if user:
            notes = Note.query.filter_by(user_id=user.id).all()
            return render_template('homepage.html', notes=notes)

    # If no user information in the session, redirect to login
    flash('Please log in to access this page.', 'error')
    return redirect(url_for('gettingstarted'))

@app.route('/save_note', methods=['POST'])
def save_note():
    data = request.get_json()

    new_note = Note(title=data['title'], description=data['description'], date=data['date'], user_id=session.get('user_id'))
    db.session.add(new_note)
    db.session.commit()

    # Return the ID of the newly created note
    return jsonify({'message': 'Note saved successfully', 'note_id': new_note.id})

@app.route('/get_notes')
def get_notes():
    # Check if the user is logged in
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in'})

    user_id = session['user_id']
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'})

    # Fetch the user's notes
    notes = Note.query.filter_by(user_id=user.id).all()

    # Convert notes to a list of dictionaries
    notes_data = [{'id': note.id, 'title': note.title, 'description': note.description, 'date': note.date} for note in notes]

    return jsonify(notes_data)

@app.route('/edit_note/<int:note_id>', methods=['GET', 'POST'])
def edit_note(note_id):
    note = Note.query.get_or_404(note_id)

    if request.method == 'POST':
        data = request.get_json()
        note.title = data['title']
        note.description = data['description']
        db.session.commit()
        return jsonify({'message': 'Note updated successfully'})

    # Handle GET request, if needed
    return render_template('edit_note.html', note=note)


@app.route('/delete_note/<int:note_id>', methods=['GET', 'POST'])
def delete_note(note_id):
    note = Note.query.get_or_404(note_id)

    if request.method == 'POST':
        db.session.delete(note)
        db.session.commit()
        return jsonify({'message': 'Note deleted successfully'})

    # Handle GET request, if needed
    return render_template('delete_note.html', note=note)
from flask import jsonify


@app.route('/logout')
def logout():
    # Clear user information from the session
    session.pop('user_id', None)
    return redirect(url_for('home'))

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.2')