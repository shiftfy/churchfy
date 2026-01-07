import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TagManager } from "@/components/settings/TagManager";
import { InputManager } from "../../components/settings/InputManager";
import { SectionTabs } from "@/components/layout/SectionTabs";

export function TagsAndFields() {
    return (
        <div className="space-y-6">
            <div>
                <SectionTabs
                    items={[
                        { label: "Formulários", href: "/formularios" },
                        { label: "Fluxos", href: "/engajamento/fluxos" },
                        { label: "Inputs e Tags", href: "/engajamento/tags" },
                    ]}
                />
                <div className="mt-6">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Inputs e Tags</h1>
                    <p className="text-muted-foreground">
                        Gerencie as tags para segmentação e os campos personalizados para o perfil das pessoas.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="tags" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="tags">Tags</TabsTrigger>
                    <TabsTrigger value="inputs">Inputs Personalizados</TabsTrigger>
                </TabsList>

                <TabsContent value="tags">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gerenciar Tags</CardTitle>
                            <CardDescription>
                                Crie tags para organizar e segmentar as pessoas da sua igreja.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TagManager />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="inputs">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gerenciar Inputs</CardTitle>
                            <CardDescription>
                                Defina campos personalizados que estarão disponíveis no perfil das pessoas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InputManager />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
