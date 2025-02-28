import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans



# Define the columns to drop
columns_to_drop = [
    "player_url", "fifa_update", "fifa_update_date", "potential",
     "club_jersey_number", "club_loaned_from", "club_joined_date", "club_contract_valid_until_year",
    "nation_team_id", "nation_jersey_number", "work_rate", "body_type", "release_clause_eur",
    "ls", "st", "rs", "dob","lw", "lf", "cf", "rf", "rw", "lam", "cam", "ram", "lm", "lcm", "cm", "rcm", "rm",
    "lwb", "ldm", "cdm", "rdm", "rwb", "lb", "lcb", "cb", "rcb", "rb", "gk", "nation_position", "player_tags", "player_traits"
]

# Load dataset (update file_path with your actual file)
file_path = "data/male_players (legacy)_23.csv"  # Change this to the actual dataset file
df = pd.read_csv(file_path)

## Filter only FIFA 23 players
df = df[df["fifa_version"] == 23]

# Drop the unwanted columns
df_cleaned = df.drop(columns=columns_to_drop, errors='ignore')

# Drop rows where 'value_eur' is null
df_cleaned = df_cleaned.dropna(subset=["value_eur"])

# Save the cleaned dataset
df_cleaned.to_csv("cleaned_players.csv", index=False)

#df_cleaned.info()

# Define columns to exclude for PCA and K-Means
excluded_columns = [
    "player_id", "fifa_version", "short_name", "dob", "player_positions",
    "league_id", "league_name", "league_level", "club_team_id", "club_name",
    "nationality_id", "nationality_name", "real_face", "player_face_url", "long_name"
]

# Drop the excluded columns
df_pca_kmeans = df_cleaned.drop(columns=excluded_columns, errors='ignore')

df_cleaned_nogk = df_pca_kmeans.drop(columns=["goalkeeping_speed"], errors='ignore')
df_cleaned_nogk = df_cleaned_nogk.dropna()

# One-Hot Encoding delle colonne categoriche
categorical_features = ["club_position", "preferred_foot"]
df_preprocessed_nogk = pd.get_dummies(df_cleaned_nogk, columns=categorical_features, drop_first=True)

df_preprocessed_nogk.info()

# Selezione delle colonne numeriche per la standardizzazione
#numerical_features_nogk = df_preprocessed_nogk.select_dtypes(include=["int64", "float64"]).columns
scaler = StandardScaler()
df_preprocessed_nogk_scaled = scaler.fit_transform(df_preprocessed_nogk)

# Applicazione PCA
pca = PCA(n_components=2)  # Riduzione a 2 componenti per la visualizzazione
principal_components = pca.fit_transform(df_preprocessed_nogk_scaled)

# Creazione DataFrame con le componenti principali
df_pca = pd.DataFrame(data=principal_components, columns=["PC1", "PC2"])

# Plot dei risultati PCA
plt.figure(figsize=(10, 6))
sns.scatterplot(x=df_pca["PC1"], y=df_pca["PC2"], alpha=0.5)
plt.xlabel("Principal Component 1")
plt.ylabel("Principal Component 2")
plt.title("PCA Senza Portieri")
plt.show()
plt.savefig("pca_plot_noGK.png")




df_cleaned_gk = df_cleaned.fillna(df_cleaned.min())
# One-Hot Encoding delle colonne categoriche
categorical_features = ["player_positions", "league_name", "club_name", "nationality_name"]
df_preprocessed_gk = pd.get_dummies(df_cleaned_gk, columns=categorical_features, drop_first=True)

# Selezione delle colonne numeriche per la standardizzazione
numerical_features = df_preprocessed_gk.select_dtypes(include=["int64", "float64"]).columns
scaler = StandardScaler()
df_preprocessed_gk[numerical_features] = scaler.fit_transform(df_preprocessed_gk[numerical_features])

# Applicazione PCA
pca = PCA(n_components=2)  # Riduzione a 2 componenti per la visualizzazione
principal_components = pca.fit_transform(df_preprocessed_gk[numerical_features])

# Creazione DataFrame con le componenti principali
df_pca = pd.DataFrame(data=principal_components, columns=["PC1", "PC2"])

# Plot dei risultati PCA
plt.figure(figsize=(10, 6))
sns.scatterplot(x=df_pca["PC1"], y=df_pca["PC2"], alpha=0.5)
plt.xlabel("Principal Component 1")
plt.ylabel("Principal Component 2")
plt.title("PCA con NaN Sostituiti (Inclusi Portieri)")
plt.savefig("pca_plot_with_gk.png")  # Salva il grafico come immagine
plt.show()  # Mostra il grafico



X = df_cleaned_gk[numerical_features]

# Standardizzazione delle caratteristiche
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Applicazione dell'Elbow Method
inertia = []
k_values = range(1, 11)  # Prova per k da 1 a 10

for k in k_values:
    kmeans = KMeans(n_clusters=k, init='k-means++', random_state=42)
    kmeans.fit(X_scaled)
    inertia.append(kmeans.inertia_)

# Plot dell'Elbow Method
plt.figure(figsize=(10, 6))
plt.plot(k_values, inertia, marker='o')
plt.title('Elbow Method With GK')
plt.xlabel('Number of Clusters (k)')
plt.ylabel('Inertia')
plt.xticks(k_values)
plt.grid()
plt.savefig("elbow_method_gk.png")
plt.show()



X = df_cleaned_nogk[numerical_features_nogk]

# Standardizzazione delle caratteristiche
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Applicazione dell'Elbow Method
inertia = []
k_values = range(1, 11)  # Prova per k da 1 a 10

for k in k_values:
    kmeans = KMeans(n_clusters=k, init='k-means++', random_state=42)
    kmeans.fit(X_scaled)
    inertia.append(kmeans.inertia_)

# Plot dell'Elbow Method
plt.figure(figsize=(10, 6))
plt.plot(k_values, inertia, marker='o')
plt.title('Elbow Method With No GK')
plt.xlabel('Number of Clusters (k)')
plt.ylabel('Inertia')
plt.xticks(k_values)
plt.grid()
plt.savefig("elbow_method_nogk.png")
plt.show()