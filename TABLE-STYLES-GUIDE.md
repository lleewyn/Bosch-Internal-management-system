# Guia de Estilos Unificados para Tabelas | Bosch HR System

## 📋 Visão Geral

Este documento detalha o novo sistema de estilos unificado para todas as tabelas no Bosch HR Management System. Todos os estilos de tabela foram consolidados em `css/tables.css` para garantir consistência visual em toda a aplicação.

## 🎨 Componentes Principales

### 1. Container da Tabela
Use a classe `.table-container` ou `.table-wrapper` para envolver qualquer tabela:

```html
<div class="table-container">
    <table class="bosch-table">
        <!-- conteúdo -->
    </table>
</div>
```

### 2. Classes de Tabela Suportadas
Todas essas classes usam o mesmo estilo unificado:
- `.bosch-table` - Tabelas gerais
- `.op-table` - Tabelas de operações
- `.log-table` - Tabelas de atividades
- `.data-table` - Tabelas de dados genéricas

## 🏗️ Estrutura HTML Recomendada

```html
<div class="table-container">
    <table class="bosch-table">
        <thead>
            <tr>
                <th>Coluna 1</th>
                <th>Coluna 2</th>
                <th>Coluna 3</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Dados</td>
                <td>Dados</td>
                <td>Dados</td>
            </tr>
        </tbody>
    </table>
</div>
```

## 📌 Utilitários de Colunas

### Coluna de Código/ID
```html
<td class="code-col">BS2041</td>
```
Estilo: Monospace, peso 700, cor muted

### Coluna de Nome
```html
<td class="name-col">Nguyen Van A</td>
```
Estilo: Peso 700, cor principal

### Coluna de Papel/Posição
```html
<td class="role-col">Lead Engineer</td>
```
Estilo: Peso 500, cor secundária

### Coluna de Projeto
```html
<td class="project-col">Precision Sensor Module</td>
```
Estilo: Peso 600, cor principal

### Coluna de Data/Hora
```html
<td class="time-col">
    <span class="date">24 thg 10, 2023</span>
    <span class="sub">14:32:15 GMT+7</span>
</td>
```

## 👤 Células com Usuário/Funcionário

```html
<td class="user-cell">
    <div class="user-avatar">NV</div>
    <div class="user-info">
        <span class="name">Nguyen Van A</span>
        <span class="id">BOS-9921</span>
    </div>
</td>
```

Ou com imagem:
```html
<td class="user-cell">
    <img src="avatar.jpg" alt="Avatar" class="user-avatar">
    <div class="user-info">
        <span class="name">Nguyen Van A</span>
        <span class="id">BOS-9921</span>
    </div>
</td>
```

## 🏷️ Badges e Status

### Badges de Status
```html
<!-- Sucesso -->
<span class="status-badge badge-success">Ôn định</span>

<!-- Erro -->
<span class="status-badge badge-danger">Bị từ chối</span>

<!-- Aviso -->
<span class="status-badge badge-warning">Aviso</span>

<!-- Info -->
<span class="status-badge badge-info">Informação</span>
```

### Categorias de Atividades
```html
<span class="cat-salary">Lương & Thưởng</span>
<span class="cat-denied">Cảnh báo</span>
<span class="cat-login">Đăng nhập</span>
<span class="cat-data">Dữ liệu</span>
<span class="cat-system">Hệ thống</span>
```

## 💰 Valores Numéricos

### Valores Positivos (Verde)
```html
<td class="value value-green">+25.000.000 VND</td>
<td class="amount amount-positive">+45 OT</td>
```

### Valores Negativos (Vermelho)
```html
<td class="value value-red">-500.000 VND</td>
<td class="amount amount-negative">-10%</td>
```

### Valores Neutros (Azul)
```html
<td class="value value-blue">150 horas</td>
<td class="amount amount-neutral">100%</td>
```

## 📊 Barra de Progresso

```html
<td class="progress-cell">
    <div class="progress-bar">
        <div class="progress-fill" style="width: 75%"></div>
    </div>
    <span class="progress-text">75%</span>
</td>
```

## 🔧 Botões de Ação em Tabelas

```html
<td class="table-actions">
    <button class="action-btn edit" title="Editar">
        <i class="fa-solid fa-pen"></i>
    </button>
    <button class="action-btn delete" title="Deletar">
        <i class="fa-solid fa-trash"></i>
    </button>
</td>
```

### Estilos de Botão:
- `.action-btn.edit` - Amarelo, cor edit
- `.action-btn.delete` - Vermelho, cor perigo

## 🏷️ Tags/Rótulos em Células

### Grupo de Tags
```html
<td class="tag-group">
    <span class="tag-item">Cloud Architecture</span>
    <span class="tag-item">Microservices</span>
    <span class="tag-item">DevOps</span>
</td>
```

### Tag Individual
```html
<span class="tag-item">Bosch Smart Oven</span>
```

## 📝 Texto de Nota/Descrição

```html
<td class="note-text">
    Cód nên tranh cập múc đun Cải đặt Admin không có quyền hạn hợp lệ
</td>
```

### Destaque Especial
```html
<span class="highlight">THEO KH-002</span>
```

## 🎯 Casos de Uso por Página

### Página HR (Nhân Sự)
- Use `.bosch-table` para lista de funcionários
- Use `.code-col`, `.name-col`, `.role-col` para colunas padrão
- Use `.user-cell` para avatares + nome + ID
- Use `.status-badge` para status de alocação

### Página Operations (Vận Hành)
- Use `.op-table` (aplicará os mesmos estilos de `.bosch-table`)
- Use `.company-name` para nomes de empresas
- Use `.value-green`, `.value-red`, `.value-blue` para valores
- Use `.tag-group` para listar múltiplos projetos

### Activity Log (Nhật Ký)
- Use `.log-table` para histórico
- Use `.time-col` para datas/horas estruturadas
- Use `.user-cell` com avatar para usuários
- Use `.cat-*` para categorias de eventos
- Use `.note-text` para descrições de atividades

### Budget (Ngân Sách)
- Use `.bosch-table` ou `.op-table`
- Use `.progress-cell` para progresso de orçamento
- Use `.value-green/red/blue` para valores monetários
- Use `.tag-item` para projetos relacionados
- Use `.highlight` para informações OT importantes

## 📱 Responsividade

Os estilos são automaticamente ajustados em telas menores:
- **Desktop**: padding completo, font-size normal
- **Tablets (1024px)**: padding e font-size reduzidos em 20%
- **Mobile (768px)**: padding e font-size reduzidos em 30%, avatares menores

## 🔄 Migração de Páginas Existentes

Para migrar uma página existente:

1. **Adicione o CSS:**
   ```html
   <link rel="stylesheet" href="css/tables.css">
   ```

2. **Atualize as classes da tabela:**
   - Altere classes customizadas para `.bosch-table`, `.op-table`, ou `.log-table`

3. **Refatore as colunas:**
   - Aplique as classes utilitárias (`.code-col`, `.name-col`, etc.)

4. **Substitua badges:**
   - Use `.status-badge` + `.badge-*` em vez de estilos inline

5. **Teste a responsividade:**
   - Verifique em diferentes tamanhos de tela

## ✅ Checklist de Consistência

Ao criar ou modificar uma tabela, certifique-se de:

- [ ] Table está envolvida em `.table-container`
- [ ] Cabeçalhos dentro de `<thead>` com `<th>`
- [ ] Colunas usam as classes utilitárias apropriadas
- [ ] Badges usam classes padronizadas
- [ ] Valores numéricos têm `.value` + `.value-*`
- [ ] Cells de usuário usam `.user-cell`
- [ ] Botões de ação usam `.action-btn`
- [ ] Não há estilos inline (exceto style dinâmico necessário)
- [ ] Página inclui `css/tables.css`

## 🎨 Cores de Referência

| Classe | Cor | Uso |
|--------|-----|-----|
| `.badge-success` / `.value-green` | #10B981 | Positivo, Sucesso |
| `.badge-danger` / `.value-red` | #EF4444 | Negativo, Erro |
| `.badge-warning` / `.cat-system` | #F59E0B | Aviso |
| `.badge-info` / `.value-blue` | #2563EB | Informação |
| `.value-orange` | #F97316 | Destaque especial |

## 📞 Suporte

Para dúvidas sobre implementação ou para adicionar novos padrões de tabela:

1. Verifique se o padrão já existe em `css/tables.css`
2. Se necessário, adicione novas classes mantendo a convenção de nomenclatura
3. Documente o novo padrão neste arquivo

---

**Última atualização**: Maio 2026
**Versão**: 1.0
