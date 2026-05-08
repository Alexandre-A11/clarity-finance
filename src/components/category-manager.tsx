import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeQuery } from "@/lib/data-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Settings, Tag } from "lucide-react";
import { ColorSwatchPicker } from "./color-swatch-picker";
import { CategoryIcon, IconPicker } from "./icon-picker";
import { toast } from "sonner";

type Cat = { id: string; name: string; kind: "income" | "expense"; color: string; icon: string };

export function CategoryManagerTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1.5" /> Categorias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tag className="h-4 w-4" /> Gerenciar categorias</DialogTitle>
        </DialogHeader>
        <CategoryManager />
      </DialogContent>
    </Dialog>
  );
}

function CategoryManager() {
  const { user } = useAuth();
  const { data: cats } = useRealtimeQuery("categories", user?.id);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [creatingKind, setCreatingKind] = useState<"income" | "expense" | null>(null);

  return (
    <div>
      <Tabs defaultValue="expense">
        <TabsList>
          <TabsTrigger value="expense">Despesas</TabsTrigger>
          <TabsTrigger value="income">Receitas</TabsTrigger>
        </TabsList>
        {(["expense", "income"] as const).map((k) => (
          <TabsContent value={k} key={k} className="mt-4">
            <ul className="divide-y divide-border rounded-lg border border-border max-h-80 overflow-auto">
              {(cats as Cat[]).filter((c) => c.kind === k).map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                  <span
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ background: c.color + "1a", color: c.color }}
                  >
                    <CategoryIcon name={c.icon} className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    const { error } = await supabase.from("categories").delete().eq("id", c.id);
                    if (error) toast.error(error.message); else toast.success("Removida");
                  }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </li>
              ))}
              {(cats as Cat[]).filter((c) => c.kind === k).length === 0 && (
                <li className="px-3 py-6 text-sm text-muted-foreground text-center">Nenhuma categoria.</li>
              )}
            </ul>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setCreatingKind(k)}>
              <Plus className="h-4 w-4 mr-1.5" /> Nova categoria
            </Button>
          </TabsContent>
        ))}
      </Tabs>

      {(editing || creatingKind) && (
        <CategoryFormDialog
          userId={user!.id}
          category={editing}
          kind={editing?.kind ?? creatingKind!}
          onClose={() => { setEditing(null); setCreatingKind(null); }}
        />
      )}
    </div>
  );
}

function CategoryFormDialog({
  userId, category, kind, onClose,
}: { userId: string; category: Cat | null; kind: "income" | "expense"; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? "#3b82f6");
  const [icon, setIcon] = useState(category?.icon ?? "circle");

  useEffect(() => {
    setName(category?.name ?? "");
    setColor(category?.color ?? "#3b82f6");
    setIcon(category?.icon ?? "more-horizontal");
  }, [category]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    if (category) {
      const { error } = await supabase.from("categories")
        .update({ name, color, icon }).eq("id", category.id);
      if (error) return toast.error(error.message);
      toast.success("Atualizada");
    } else {
      const { error } = await supabase.from("categories")
        .insert({ user_id: userId, name, color, icon, kind } as any);
      if (error) return toast.error(error.message);
      toast.success("Criada");
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="rounded-lg border border-border bg-muted/30">
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <span
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ background: color + "1a", color }}
            >
              <CategoryIcon name={icon} className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium">{name || "Pré-visualização"}</span>
          </div>
          <Button type="submit" className="w-full">Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
