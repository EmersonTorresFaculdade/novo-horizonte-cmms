
import os

path = r'c:\Users\Emerson\Downloads\novo-horizonte-cmms\pages\WorkOrderDetails.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_logic = """                                  try {
                                     setSaving(true);
                                     const { error: cancelError } = await supabase.rpc('cancel_work_order', {
                                        p_work_order_id: id,
                                        p_admin_name: user?.name || 'Administrador'
                                     });

                                     if (cancelError) throw cancelError;

                                     if (workOrder) {
                                        await NotificationService.notifyWorkOrderCancelled({
                                           id: workOrder.id,
                                           title: `OS CANCELADA: ${workOrder.order_number}`,
                                           description: editIssue || workOrder.issue,
                                           status: 'Cancelado',
                                        } as any, user?.name || 'Administrador');
                                     }

                                     setFeedback({
                                        type: 'success',
                                        title: 'OS Cancelada',
                                        message: 'A Ordem de Serviço foi cancelada e o número foi liberado.',
                                        showLoading: true
                                     });

                                     setTimeout(() => {
                                        navigate('/work-orders');
                                     }, 2000);
                                  } catch (error) {
                                     console.error('Error canceling order:', error);
                                     setFeedback({
                                        type: 'error',
                                        title: 'Erro ao Cancelar',
                                        message: (error as any).message || 'Ocorreu um erro inesperado.'
                                     });
                                  } finally {
                                     setSaving(false);
                                  }
"""

start_idx = -1
for i, line in enumerate(lines):
    if "setStatus('Cancelado');" in line:
        start_idx = i
        break

if start_idx != -1:
    # Find the end of the block (setTimeout(handleSave, 100);)
    end_idx = -1
    for j in range(start_idx, start_idx + 15):
        if "setTimeout(handleSave, 100);" in lines[j]:
            end_idx = j
            break
    
    if end_idx != -1:
        lines[start_idx : end_idx + 1] = [new_logic + '\n']
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"SUCCESS: Replaced lines {start_idx+1} to {end_idx+1}")
    else:
        print("FAILURE: Could not find end of block")
else:
    print("FAILURE: Could not find start of block")
